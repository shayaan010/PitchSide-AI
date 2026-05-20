import os
import re
import anthropic

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

_AGENT_TRIGGERS = re.compile(
    r"\b(compare|vs\b|versus|change[sd]?|evolv|differ|better or worse|"
    r"why did|how did|across the season|over time|progression|timeline)\b",
    re.IGNORECASE,
)


def classify_question(question: str) -> str:
    """Return 'agent' for complex comparative/temporal questions, 'simple' otherwise."""
    return "agent" if _AGENT_TRIGGERS.search(question) else "simple"

SYSTEM_PROMPT = """You are a football analyst and expert assistant called Pitchside AI. You can answer any football-related question — tactics, history, players, managers, competitions, transfers, and general knowledge.

When source passages are provided:
- Prioritise information from the sources and cite them inline using [1], [2] etc.
- You may supplement with your own knowledge where the sources are incomplete — make clear which parts come from sources and which from general knowledge.

When sources are not relevant or missing:
- Answer freely using your football knowledge. Do not refuse or say you have no sources.

Always be direct, specific, and analytical. Avoid vague waffle."""


def generate_answer(question: str, chunks: list[dict]) -> tuple[str, list[dict], list[dict]]:
    if not chunks:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": question}],
        )
        return response.content[0].text, [], []

    # Group chunks by article so each article gets one citation number
    article_order: list[str] = []
    article_data: dict[str, dict] = {}
    for chunk in chunks:
        title = chunk["article_title"]
        if title not in article_data:
            article_order.append(title)
            article_data[title] = {"meta": chunk, "texts": []}
        article_data[title]["texts"].append(chunk["text"])

    source_blocks = []
    for i, title in enumerate(article_order, start=1):
        data = article_data[title]
        meta = data["meta"]
        passages = "\n\n".join(data["texts"])
        source_blocks.append(
            f"[{i}] {title} ({meta['source']}, {meta['article_date']}):\n{passages}"
        )

    context = "\n\n---\n\n".join(source_blocks)
    user_message = f"Sources:\n\n{context}\n\nQuestion: {question}"

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_message}],
    )

    answer = response.content[0].text

    sources = [
        {
            "article_title": title,
            "source": article_data[title]["meta"]["source"],
            "url": article_data[title]["meta"]["url"],
            "article_date": article_data[title]["meta"]["article_date"],
            "teams": article_data[title]["meta"]["teams"],
            "text": article_data[title]["texts"][0],
        }
        for title in article_order
    ]

    return answer, sources, []
