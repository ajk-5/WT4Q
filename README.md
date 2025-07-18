# WT4Q

This repository hosts a full stack application consisting of a Next.js front end and a .NET backend.

## Project Structure

- **WT4Q/WT4Q** – Next.js front-end code
- **Northeast** – ASP.NET Core backend

## Getting Started

### Front End

```bash
cd WT4Q/WT4Q
npm install
npm run dev
```

This starts the Next.js development server on http://localhost:3000.

### Backend

```bash
cd Northeast
dotnet restore
dotnet run
```

The API will run on the port configured in the project settings.
