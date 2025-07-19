# WT4Q

\
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

Authentication cookies from the API are issued with the `Secure` and
`SameSite=None` attributes (see
`Northeast/Controllers/AdminController.cs`). Browsers will not send
these cookies from an insecure (HTTP) page. For local development run
the front end over HTTPS:

```bash
cd WT4Q/WT4Q
HTTPS=true npm run dev
```

If your environment requires it, generate a local certificate and set
the `SSL_CERT_FILE` and `SSL_KEY_FILE` environment variables as
described in the Next.js documentation.

### Backend

```bash
cd Northeast
dotnet restore
dotnet run
```

The API will run on the port configured in the project settings.

This repository contains a Next.js app in the `WT4Q` directory and a .NET API in the `Northeast` directory.
