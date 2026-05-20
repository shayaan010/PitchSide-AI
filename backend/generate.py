import os
import anthropic

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are a football tactics analyst. Your role is to synthesise precise, evidence-based answers exclusively from the numbered source passages provided.

Rules:
- Answer ONLY from the source passages given. Do not use outside knowledge.
- Cite sources inline using [1], [2] etc., matching the numbers in the source list.
- If the sources lack sufficient information to answer confidently, say so honestly — never speculate or hallucinate.
- Keep answers focused on tactical specifics: formations, pressing triggers, defensive shape, player roles, transitions, set-piece organisation.
- Do not engage in general football conversation unrelated to tactics."""


def generate_answer(question: str, chunks: list[dict]) -> tuple[str, list[dict]]:
    if not chunks:
        return "No relevant sources were found to answer this question.", []

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

    return answer, sources
