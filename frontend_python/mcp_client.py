import asyncio
import json
from typing import Dict, List, Any, Optional
from contextlib import AsyncExitStack
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

class MCPClient:
    def __init__(self):
        self.tools = []
        self._tools_cached = False
    
    async def _get_tools(self) -> List[Dict[str, Any]]:
        """Get tools from MCP server"""
        if self._tools_cached:
            return self.tools
            
        try:
            # Start the MCP server process
            server_params = StdioServerParameters(
                command="python",
                args=["app.py"],
                cwd="/Users/srivinothinevadivel/Documents/GoFaGo2/backend"
            )
            
            # Connect to the server using AsyncExitStack
            async with AsyncExitStack() as exit_stack:
                stdio_transport = await exit_stack.enter_async_context(stdio_client(server_params))
                stdio, write = stdio_transport
                session = await exit_stack.enter_async_context(ClientSession(stdio, write))
                
                # Initialize the session
                await session.initialize()
                
                # List available tools
                response = await session.list_tools()
                self.tools = response.tools
                self._tools_cached = True
                
                return self.tools
                    
        except Exception as e:
            print(f"Error getting tools from MCP server: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    async def call_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Call an MCP tool with given parameters"""
        try:
            # Start the MCP server process
            server_params = StdioServerParameters(
                command="python",
                args=["app.py"],
                cwd="/Users/srivinothinevadivel/Documents/GoFaGo2/backend"
            )
            
            # Connect to the server using AsyncExitStack
            async with AsyncExitStack() as exit_stack:
                stdio_transport = await exit_stack.enter_async_context(stdio_client(server_params))
                stdio, write = stdio_transport
                session = await exit_stack.enter_async_context(ClientSession(stdio, write))
                
                # Initialize the session
                await session.initialize()
                
                print(f"Calling tool {tool_name} with parameters: {parameters}")
                # Call the tool
                result = await session.call_tool(tool_name, parameters)
                print(f"Tool result: {result}")
                
                # Parse the JSON result
                if result.content and len(result.content) > 0:
                    content = result.content[0]
                    if hasattr(content, 'text'):
                        result_text = content.text
                        print(f"Tool result text: {result_text}")
                        return json.loads(result_text)
                
                return {"success": False, "error": "No result from tool"}
            
        except Exception as e:
            print(f"Error calling tool {tool_name}: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
    
    async def get_tools_for_llm(self) -> List[Dict[str, Any]]:
        """Get tools formatted for LLM tool calling"""
        tools = await self._get_tools()
        llm_tools = []
        
        for tool in tools:
            # Convert MCP tool to Anthropic format
            llm_tool = {
                "name": tool.name,
                "description": tool.description,
                "input_schema": {
                    "type": "object",
                    "properties": tool.inputSchema.get("properties", {}),
                    "required": tool.inputSchema.get("required", [])
                }
            }
            llm_tools.append(llm_tool)
        
        return llm_tools

# Global MCP client instance
mcp_client = MCPClient()