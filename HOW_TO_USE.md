# Lead Generation System - How to Use

## API Endpoint
`POST /api/research/run`

## Two Ways to Use:

### 1. NEW: Search by Job Keywords (Recommended)
Find companies posting jobs with high AI replacement potential:

```json
{
  "keywords": "Data Entry Specialist",
  "location": "Utah",
  "notes": "Looking for companies that need AI automation"
}
```

This will:
- Search Indeed for "Data Entry Specialist" jobs in Utah
- Extract companies posting these jobs
- Research each company found
- Return opportunities with AI replacement potential

### 2. Research Specific Company (Original)
If you already know a company:

```json
{
  "companyName": "Acme Corp",
  "companyUrl": "https://acmecorp.com",
  "notes": "Potential client interested in automation"
}
```

## High-Value Keywords to Search:

### Data & Reporting
- Data Entry Specialist
- Reporting Analyst
- Business Analyst
- Data Reconciliation Specialist

### Customer Service
- Customer Service Representative
- Chat Support Specialist
- Email Response Specialist
- Order Processing Clerk

### Operations
- Operations Coordinator
- Scheduling Coordinator
- Inventory Analyst
- Quality Assurance Analyst

### Finance
- Accounts Payable Clerk
- Invoice Processing Specialist
- Financial Reconciliation Analyst

## Example cURL Request:

```bash
curl -X POST https://your-app.vercel.app/api/research/run \
  -H "Content-Type: application/json" \
  -H "x-client-id: YOUR_CLIENT_ID" \
  -H "x-user-id: admin-user-id" \
  -d '{
    "keywords": "Data Entry Specialist",
    "location": "Salt Lake City"
  }'
```

## Response Format:

```json
{
  "jobId": "job_1234567890",
  "model": "opportunity-search",
  "summary": "Found 15 companies hiring for 'Data Entry Specialist' in Salt Lake City. Analyzed top 5 companies.",
  "findings": [
    {
      "company": "Company A",
      "jobs": [...],
      "research": [...]
    }
  ]
}
```

## Value Proposition Calculation:
- Human Cost: Salary + 30% benefits + 20% turnover = 1.5x salary
- AI Solution: 50-75% of annual human cost
- ROI: Typically 6-month payback
- Advantage: 24/7 availability, 99.9% accuracy, no turnover