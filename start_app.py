#!/usr/bin/env python3
"""
Start the Nike Fashion Assistant Application
"""

import subprocess
import sys
import time
import os

def main():
    print("🚀 Starting Nike Fashion Assistant")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists("backend/app.py") or not os.path.exists("frontend_python/app.py"):
        print("❌ Error: Please run this script from the project root directory.")
        sys.exit(1)
    
    print("✅ Backend MCP server: Starting...")
    print("✅ Frontend Flask app: Starting...")
    print()
    print("🌐 Frontend URL: http://localhost:8501")
    print("🔧 Backend MCP: Running on STDIO")
    print("🛑 Press Ctrl+C to stop both services")
    print("=" * 50)
    
    try:
        # Start backend MCP server
        backend_process = subprocess.Popen([
            sys.executable, "app.py"
        ], cwd="backend")
        
        # Wait a moment for backend to start
        time.sleep(2)
        
        # Start frontend Flask app
        frontend_process = subprocess.Popen([
            sys.executable, "app.py"
        ], cwd="frontend_python")
        
        # Wait for both processes
        try:
            backend_process.wait()
        except KeyboardInterrupt:
            print("\n👋 Shutting down Nike Fashion Assistant...")
            backend_process.terminate()
            frontend_process.terminate()
            
    except Exception as e:
        print(f"❌ Error starting application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
