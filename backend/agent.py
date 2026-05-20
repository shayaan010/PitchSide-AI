import json
import os
import anthropic

from retrieval import retrieve
from db import get_all_articles

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

AGENT_SYSTEM = """You are Pitchside AI, an expert football analyst. You have tools to search ingested match reports and articles. Use them to gather evidence before answering.

Guidelines:
- For comparative questions, call compare_aspects to get both sides simultaneously.
- For team-specific questions, first call get_team_matches to understand coverage, then search_articles for content.
- For match-specific questions, use search_by_match.
- Always cite sources inline using [1], [2] etc. from the chunks returned by tools.
- Supplement with general knowledge when sources are thin, but say so clearly.
- Be direct, analytical, and specific."""

TOOLS = [
    {
        "name": "search_articles",
        "description": "Search ingested articles/match reports for relevant passages. Use for narrative and analytical content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "teams": {"type": "array", "items": {"type": "string"}, "description": "Filter by team names"},
                "date_from": {"type": "string", "description": "Start date YYYY-MM-DD"},
                "date_to": {"type": "string", "description": "End date YYYY-MM-DD"},
                "competition": {"type": "string", "description": "Filter by competition"},
                "k": {"type": "integer", "description": "Number of chunks to return (default 8)", "default": 8},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_team_matches",
        "description": "List all ingested articles mentioning a team. Use to check coverage before diving into content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "team": {"type": "string", "description": "Team name"},
                "season": {"type": "string", "description": "Season e.g. '2023-24'"},
                "competition": {"type": "string", "description": "Filter by competition"},
            },
            "required": ["team"],
        },
    },
    {
        "name": "compare_aspects",
        "description": "Run two searches in parallel and return both result sets labelled A and B. Use for comparative questions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query_a": {"type": "string", "description": "First search query"},
                "query_b": {"type": "string", "description": "Second search query"},
                "shared_filters": {
                    "type": "object",
                    "description": "Filters applied to both searches (teams, date_from, date_to, competition)",
                },
            },
            "required": ["query_a", "query_b"],
        },
    },
    {
        "name": "search_by_match",
        "description": "Find chunks where both teams appear, optionally near a specific date.",
        "input_schema": {
            "type": "object",
            "properties": {
                "team_home": {"type": "string", "description": "First team"},
                "team_away": {"type": "string", "description": "Second team (optional)"},
                "date": {"type": "string", "description": "Approximate match date YYYY-MM-DD"},
            },
            "required": ["team_home"],
        },
    },
]


def _run_tool(name: str, args: dict) -> tuple[str, list[dict]]:
    """Execute a tool call and return (json_result_str, raw_chunks)."""
    chunks: list[dict] = []

    if name == "search_articles":
        chunks = retrieve(
            args["query"],
            top_k=args.get("k", 8),
            teams=args.get("teams"),
            date_from=args.get("date_from"),
            date_to=args.get("date_to"),
            competition=args.get("competition"),
        )
        result = [
            {
                "title": c["article_title"],
                "source": c["source"],
                "date": c["article_date"],
                "teams": c["teams"],
                "text": c["text"],
            }
            for c in chunks
        ]

    elif name == "get_team_matches":
        team = args["team"].lower()
        season = args.get("season", "")
        competition = args.get("competition", "")
        all_articles = get_all_articles()
        matches = []
        for a in all_articles:
            if team not in a["teams"].lower():
                continue
            if season and season not in a["article_date"]:
                continue
            if competition and competition.lower() not in a["competition"].lower():
                continue
            matches.append({"title": a["title"], "date": a["article_date"], "source": a["source"]})
        result = matches

    elif name == "compare_aspects":
        filters = args.get("shared_filters") or {}
        chunks_a = retrieve(args["query_a"], top_k=6, **filters)
        chunks_b = retrieve(args["query_b"], top_k=6, **filters)
        chunks = chunks_a + chunks_b
        result = {
            "A": [{"title": c["article_title"], "date": c["article_date"], "text": c["text"]} for c in chunks_a],
            "B": [{"title": c["article_title"], "date": c["article_date"], "text": c["text"]} for c in chunks_b],
        }

    elif name == "search_by_match":
        home = args["team_home"]
        away = args.get("team_away")
        date = args.get("date")
        teams = [home] + ([away] if away else [])
        chunks = retrieve(
            f"{home} {away or ''} match tactical",
            top_k=8,
            teams=teams,
            date_from=date,
            date_to=date,
        )
        result = [{"title": c["article_title"], "date": c["article_date"], "text": c["text"]} for c in chunks]

    else:
        result = {"error": f"Unknown tool: {name}"}

    return json.dumps(result), chunks


def run_agent(question: str) -> tuple[str, list[dict], list[dict]]:
    """
    Run the agentic loop.
    Returns (answer, sources, trace)
    where trace = [{"tool": name, "args": args, "label": human_readable_str}, ...]
    """
    messages = [{"role": "user", "content": question}]
    all_chunks: list[dict] = []
    trace: list[dict] = []

    for _ in range(6):  # max iterations
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=[{"type": "text", "text": AGENT_SYSTEM, "cache_control": {"type": "ephemeral"}}],
            tools=TOOLS,
            messages=messages,
        )

        # Collect any text blocks
        text_blocks = [b.text for b in response.content if b.type == "text"]
        tool_uses = [b for b in response.content if b.type == "tool_use"]

        if response.stop_reason == "end_turn" or not tool_uses:
            answer = "\n\n".join(text_blocks) if text_blocks else "I could not find enough information to answer."
            break

        # Add assistant turn
        messages.append({"role": "assistant", "content": response.content})

        # Process all tool calls
        tool_results = []
        for tu in tool_uses:
            result_str, chunks = _run_tool(tu.name, tu.input)
            all_chunks.extend(chunks)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tu.id,
                "content": result_str,
            })
            trace.append({
                "tool": tu.name,
                "args": tu.input,
                "label": _human_label(tu.name, tu.input),
            })

        messages.append({"role": "user", "content": tool_results})
    else:
        # Force a final synthesis — Claude gathered evidence but didn't write an answer
        messages.append({"role": "user", "content": "You have gathered enough information. Now write a complete, cited answer to the original question."})
        final = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=[{"type": "text", "text": AGENT_SYSTEM, "cache_control": {"type": "ephemeral"}}],
            messages=messages,
        )
        text_blocks = [b.text for b in final.content if b.type == "text"]
        answer = "\n\n".join(text_blocks) if text_blocks else "I could not find enough information to answer."

    # Deduplicate and build sources
    seen_titles: set[str] = set()
    sources: list[dict] = []
    for c in all_chunks:
        t = c["article_title"]
        if t not in seen_titles:
            seen_titles.add(t)
            sources.append({
                "article_title": t,
                "source": c["source"],
                "url": c["url"],
                "article_date": c["article_date"],
                "teams": c["teams"],
                "text": c["text"],
            })

    return answer, sources, trace


def _human_label(tool: str, args: dict) -> str:
    if tool == "search_articles":
        parts = [f'Searched for "{args["query"]}"']
        if args.get("teams"):
            parts.append(f"({', '.join(args['teams'])})")
        if args.get("date_from") or args.get("date_to"):
            parts.append(f"{args.get('date_from', '')}–{args.get('date_to', '')}")
        return " ".join(parts)
    if tool == "get_team_matches":
        return f"Listed articles mentioning {args['team']}"
    if tool == "compare_aspects":
        return f'Compared "{args["query_a"]}" vs "{args["query_b"]}"'
    if tool == "search_by_match":
        teams = args["team_home"]
        if args.get("team_away"):
            teams += f" vs {args['team_away']}"
        return f"Searched match: {teams}"
    return tool
