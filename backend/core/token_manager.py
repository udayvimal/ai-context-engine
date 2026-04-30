from typing import List

from api.models.schemas import Message, MessageRole


def smart_truncate(messages: List[Message], max_messages: int = 25) -> List[Message]:
    """
    Keep first 5 + last (max_messages - 5) messages for long conversations.
    Inserts a system separator so the LLM knows context was trimmed.
    Returns the original list unchanged when it fits within max_messages.
    """
    if len(messages) <= max_messages:
        return messages

    head_count = 5
    tail_count = max_messages - head_count  # 20 by default

    head = messages[:head_count]
    tail = messages[-tail_count:]
    omitted = len(messages) - head_count - tail_count

    separator = Message(
        role=MessageRole.system,
        content=f"[{omitted} messages omitted for context window management]",
    )

    return head + [separator] + tail
