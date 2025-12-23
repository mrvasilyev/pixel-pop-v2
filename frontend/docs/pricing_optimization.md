# Cost Reduction & Pricing Optimization

## Problem
The application was generating images at a cost of approximately **$0.17 per image**.
The goal was to reduce this to **"0.0xxx"** (sub-10 cents, ideally lower).

## Research Findings
We identified the model being used as **`gpt-image-1.5`**, OpenAI's latest image model.
The pricing structure for this model (based on current data and token-based estimation in the codebase) is:

| Quality | Resolution | Est. Cost (Codebase) | Real World Est. | Suitability |
| :--- | :--- | :--- | :--- | :--- |
| **High** | 1024x1024 | ~$0.17 | Expensive | Best for premium/hero images |
| **Standard** | 1024x1024 | **~$0.04** | **Optimal** | **Balanced quality/cost for App** |
| **Low** | 1024x1024 | **~$0.009** | Very Cheap | Good for huge volume testing |

**Confusion Cleared**: The $0.17 cost comes from "High" quality usage. Switching to "Standard" drops the cost to ~$0.04, which meets the "0.0xxx" target. "Low" quality drops it even further to ~$0.009.

## Changes Implemented

### 1. Backend (`backend/worker.py`)
- **Added support for `quality="low"`**: The backend now correctly handles the `low` quality parameter for `gpt-image-1.5`.
- **Updated Cost Calculation**:
  - `High`: $0.17 (Unchanged)
  - `Standard`: $0.04 
  - `Low`: **$0.009** (New!)

### 2. Frontend (`src/api/client.js`)
- **Changed Default Quality**: The default quality for new generations has been changed from `high` to **`standard`**.
- This change immediately impacts all new users/requests, lowering the cost per generation from ~$0.17 to ~$0.04.

## How to use "Low" Quality
If you want to achieve the ~$0.009 price point, you can pass `extraConfig` when calling `generateImage`:

```javascript
// Example usage for ultra-low cost
generateImage(prompt, styleId, slug, { quality: 'low' });
```

## Next Steps
- **Verify Quality**: Test the "Standard" quality in the app to ensure it meets visual expectations.
- **Restart Backend**: Ensure the backend service is restarted to pick up the `worker.py` changes.
