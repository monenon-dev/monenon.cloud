from mcp.server.fastmcp import FastMCP

from silicon_valley.adapter.inbound.api.mcp import (
    piper_bighetti_hr_mcp_tool,
    piper_dinesh_dash_mcp_tool,
    piper_dunn_coo_mcp_tool,
    piper_gilfoyle_sys_mcp_tool,
    piper_henricks_ceo_mcp_tool,
)

mcp = FastMCP("silicon_valley")

_CHARACTER_TOOLS: tuple[tuple[str, object], ...] = (
    ("bighetti_myself", piper_bighetti_hr_mcp_tool.introduce_myself),
    ("dinesh_myself", piper_dinesh_dash_mcp_tool.introduce_myself),
    ("dunn_myself", piper_dunn_coo_mcp_tool.introduce_myself),
    ("gilfoyle_myself", piper_gilfoyle_sys_mcp_tool.introduce_myself),
    ("henricks_myself", piper_henricks_ceo_mcp_tool.introduce_myself),
)

for tool_name, handler in _CHARACTER_TOOLS:
    mcp.tool(name=tool_name)(handler)
