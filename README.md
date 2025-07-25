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

This project uses `cross-env` to set the `HTTPS` environment variable so the
development server runs correctly on all platforms, including Windows.

This starts the Next.js development server on https://localhost:3000.

Authentication cookies from the API are issued with the `Secure` and
`SameSite=None` attributes (see
`Northeast/Controllers/AdminController.cs`). Browsers require the
`Secure` flag whenever `SameSite=None` is used, so the front end **must**
be served over HTTPS. If you start the front end over plain HTTP, these
cookies will be rejected and you'll be redirected back to the login
page. Always run the development server over HTTPS to avoid this issue.

If your environment requires it, generate a local certificate and set
the `SSL_CERT_FILE` and `SSL_KEY_FILE` environment variables as
described in the Next.js documentation.

The front end now verifies admin authentication on the server. Since the
`AdminToken` cookie is marked `HttpOnly`, client-side code cannot read it.
Redirects on the admin login and dashboard pages rely on the server-side
`cookies()` API, ensuring authentication works even when JavaScript cannot
access the cookie.

### Backend

```bash
cd Northeast
dotnet restore
dotnet run
```

The API will run on the port configured in the project settings.

### Applying Migrations

When new migrations are added (for example, a migration named `AddIsGuestToVisitors`), update the database by running:

```bash
dotnet ef database update
```
from the `Northeast` directory.

This repository contains a Next.js app in the `WT4Q` directory and a .NET API in the `Northeast` directory.

### Weather Forecast

Current weather data comes from Open‑Meteo. For a more detailed 24‑hour forecast the application now queries the Norwegian Meteorological Institute API (`api.met.no`). If you use this service commercially, follow their terms of service and include a `User-Agent` header identifying your application.
