# Agentic AI Python Backend Structure

This backend is designed for agentic AI workflows using AWS Bedrock and agent core. It includes two agents:

- **Apparel Fetcher**: Fetches apparel details from an Excel data source based on customer chat input.
- **Apparel Matcher**: Recommends related or frequently bought-together apparel for a selected item.

## Folder Structure
- `agents/`: Contains agent classes for data query and recommendation
- `data/`: Place Excel data sources here (e.g., `apparel_catalog.xlsx`)
- `app.py`: FastAPI app with endpoints for chat and agentic workflows
- `requirements.txt`: Python dependencies
- `venv/`: Virtual environment

## AWS Bedrock & Agent Core
- Integrate AWS Bedrock in `app.py` for LLM and agent orchestration
- Extend agent classes for more advanced logic as needed

## Usage
- Place your Excel catalog in `data/apparel_catalog.xlsx`
- Start the backend: `uvicorn app:app --reload`
- Use `/agent/fetch` and `/agent/match` endpoints for agentic queries

---

See agent classes in `agents/` for customization.
