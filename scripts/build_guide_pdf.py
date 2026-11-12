"""Build the NexGate technical and non-technical guide."""

from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    ListFlowable,
    ListItem,
    KeepTogether,
    HRFlowable,
    Preformatted,
    PageBreak,
)

pdfmetrics.registerFont(TTFont("Georgia", r"C:\Windows\Fonts\georgia.ttf"))
pdfmetrics.registerFont(TTFont("Georgia-Bold", r"C:\Windows\Fonts\georgiab.ttf"))
pdfmetrics.registerFont(TTFont("Georgia-Italic", r"C:\Windows\Fonts\georgiai.ttf"))
pdfmetrics.registerFont(TTFont("Consolas", r"C:\Windows\Fonts\consola.ttf"))
pdfmetrics.registerFont(TTFont("Consolas-Bold", r"C:\Windows\Fonts\consolab.ttf"))

INK = HexColor("#1c1917")
MUTED = HexColor("#57534e")
RULE = HexColor("#d6d3d1")
BAND = HexColor("#f5f5f4")
ACCENT = HexColor("#4f46e5")

OUTPUT = Path(__file__).resolve().parents[1] / "docs" / "NexGate-How-It-Works.pdf"


def styles():
    return {
        "cover_kicker": ParagraphStyle(
            "cover_kicker",
            fontName="Georgia",
            fontSize=10,
            leading=14,
            textColor=ACCENT,
            alignment=TA_CENTER,
            tracking=1,
        ),
        "cover_title": ParagraphStyle(
            "cover_title",
            fontName="Georgia-Bold",
            fontSize=28,
            leading=34,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            fontName="Georgia-Italic",
            fontSize=12,
            leading=18,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "h1": ParagraphStyle(
            "h1",
            fontName="Georgia-Bold",
            fontSize=16,
            leading=21,
            textColor=INK,
            spaceBefore=14,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2",
            fontName="Georgia-Bold",
            fontSize=12.5,
            leading=17,
            textColor=INK,
            spaceBefore=11,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Georgia",
            fontSize=10.5,
            leading=15.5,
            textColor=INK,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            fontName="Georgia",
            fontSize=10.5,
            leading=15,
            textColor=INK,
            alignment=TA_LEFT,
        ),
        "note": ParagraphStyle(
            "note",
            fontName="Georgia-Italic",
            fontSize=9.5,
            leading=13.5,
            textColor=MUTED,
            alignment=TA_LEFT,
            spaceBefore=2,
            spaceAfter=8,
        ),
        "th": ParagraphStyle(
            "th",
            fontName="Georgia-Bold",
            fontSize=9,
            leading=12,
            textColor=INK,
        ),
        "td": ParagraphStyle(
            "td",
            fontName="Georgia",
            fontSize=9,
            leading=12.5,
            textColor=INK,
        ),
        "code": ParagraphStyle(
            "code",
            fontName="Consolas",
            fontSize=8.5,
            leading=12,
            textColor=INK,
        ),
        "footer": ParagraphStyle(
            "footer",
            fontName="Georgia",
            fontSize=8,
            leading=10,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
    }


S = styles()


def P(text, style="body"):
    return Paragraph(text, S[style])


def bullets(items):
    flow = []
    for item in items:
        flow.append(
            ListItem(Paragraph(item, S["bullet"]), leftIndent=12, bulletColor=ACCENT)
        )
    return ListFlowable(
        flow,
        bulletType="bullet",
        start="circle",
        leftIndent=16,
        bulletFontName="Georgia",
        bulletFontSize=8,
        spaceBefore=2,
        spaceAfter=8,
    )


def table(headers, rows, col_widths):
    data = [[Paragraph(cell, S["th"]) for cell in headers]]
    for row in rows:
        data.append([Paragraph(cell, S["td"]) for cell in row])
    tbl = Table(data, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BAND),
                ("TEXTCOLOR", (0, 0), (-1, 0), INK),
                ("FONTNAME", (0, 0), (-1, 0), "Georgia-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("GRID", (0, 0), (-1, -1), 0.3, RULE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, HexColor("#fafaf9")]),
            ]
        )
    )
    return tbl


def code_block(text):
    block = Preformatted(text, S["code"])
    wrapper = Table([[block]], colWidths=[174 * mm])
    wrapper.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BAND),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("BOX", (0, 0), (-1, -1), 0.4, RULE),
            ]
        )
    )
    return wrapper


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.4)
    canvas.line(18 * mm, 14 * mm, A4[0] - 18 * mm, 14 * mm)
    canvas.setFont("Georgia", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 8 * mm, "NexGate  ·  How the project works")
    canvas.drawRightString(A4[0] - 18 * mm, 8 * mm, str(doc.page))
    canvas.restoreState()


def build():
    story = []

    story.append(Spacer(1, 28 * mm))
    story.append(P("NEXGATE", "cover_kicker"))
    story.append(Spacer(1, 4 * mm))
    story.append(P("How the project works", "cover_title"))
    story.append(Spacer(1, 3 * mm))
    story.append(
        P(
            "A plain-language account of the product, a technical account of the same system, and the steps to start it on this machine.",
            "cover_sub",
        )
    )
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width="40%", thickness=0.6, color=ACCENT, spaceBefore=2, spaceAfter=8, hAlign="CENTER"))
    story.append(P("API infrastructure, simplified.", "cover_sub"))
    story.append(Spacer(1, 6 * mm))
    story.append(P("11 November 2026", "cover_sub"))
    story.append(Spacer(1, 18 * mm))
    story.append(
        table(
            ["Part", "What it covers"],
            [
                ["1. Non-technical", "Who uses NexGate, what they do, and what happens to a request."],
                ["2. Technical", "The programs, the data, the gateway path, and the assistant."],
                ["3. Start the project", "The exact order of commands from an empty terminal to the open site."],
            ],
            [42 * mm, 132 * mm],
        )
    )

    story.append(PageBreak())
    story.append(P("1. Non-technical working"))
    story.append(
        P(
            "NexGate is a front desk for other people’s APIs. An API is a door that a program uses to ask another program for information, such as today’s weather or a list of products. NexGate does not replace those programs. It stands in front of them, checks who is asking, counts how often they ask, and writes down what happened."
        )
    )
    story.append(
        P(
            "The product has two rooms that share one building. The first room is the website, where a person signs in, registers an API, creates an application, reads documentation, and tries a call. The second room is the gateway, which is the address outside programs use when they want data. A mobile app or a script never needs the publisher’s private server address. It calls NexGate, and NexGate calls the real service."
        )
    )

    story.append(P("The three kinds of visitor", "h2"))
    story.append(
        table(
            ["Person", "How they enter", "What they are here to do"],
            [
                [
                    "Provider",
                    "Creates an account and chooses Publish APIs.",
                    "Registers a service, names its address, publishes it, and sets how many calls a customer may make.",
                ],
                [
                    "Developer",
                    "Creates an account and chooses Consume APIs.",
                    "Makes an application, subscribes to a published API, receives a key, and calls the gateway.",
                ],
                [
                    "Demo visitor",
                    "Opens Instant Demo. No account and no password.",
                    "Looks around a labeled sample workspace, reads the sample APIs, and tries the playground. They cannot change the workspace.",
                ],
            ],
            [32 * mm, 58 * mm, 84 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        P(
            "A provider and a developer each receive their own organization. An organization is the private folder for that account’s APIs, applications, keys, and logs. The demo visitor is placed in a separate folder named NexGate Demo. That folder is not the same folder as a registered user’s organization."
        )
    )

    story.append(P("What a provider does", "h2"))
    story.append(
        P(
            "After sign-in, the provider opens APIs and records a service: a name, a short description, and the real web address of the service behind it. They attach a version, usually v1, and the paths that service understands, such as the path that returns the current weather. They then mark the API as published. They can attach plans. A plan is a promise about volume: how many calls are allowed each minute, each day, and each month. The overview, analytics, and request logs later show whether those calls succeeded and how long they took."
        )
    )

    story.append(P("What a developer does", "h2"))
    story.append(
        P(
            "The developer creates an application, which is the name of the program that will call the API, such as a phone app. They subscribe that application to a plan on a published API. NexGate then issues an API key. The key is the credential the program presents. The developer copies it once. After that, NexGate stores only a fingerprint of the key, so the full key cannot be read back from the database. In the playground, the developer chooses the API, pastes the key, and sends a real call through the gateway. The answer, the status, and the time taken appear on the same screen. Request logs keep a record of that call."
        )
    )

    story.append(P("What Instant Demo does", "h2"))
    story.append(
        P(
            "The home page has two doors. Instant Demo opens the sample workspace immediately. Full Registration starts a private account. Inside the demo, a badge marks the workspace as DEMO. The sample catalog contains a Weather API and a Product Catalog API, a free plan and a pro plan, one demo application, and a short history of sample requests. Those sample rows are labeled so they are not confused with a call the visitor just made. The visitor can open documentation, send a sandbox call from the playground, and ask the assistant a limited number of questions. Buttons that would create an API, rotate a key, or rename the organization are refused by the server."
        )
    )

    story.append(P("One call, told simply", "h2"))
    story.append(
        P(
            "A program sends a request to NexGate and includes its API key. NexGate checks that the key is known, still active, and belongs to an application that subscribed to this API. It checks that the application has not used up its minute, day, or month allowance. If any check fails, the caller receives a clear refusal and the attempt is still written in the log. If the checks pass, NexGate forwards the question to the real service, waits for the answer, and returns that answer. The time taken is stored with the log."
        )
    )

    story.append(P("The assistant", "h2"))
    story.append(
        P(
            "The AI Assistant is a separate page. It does not run by itself when the dashboard opens. A person chooses one of four jobs: write documentation from an API’s name and paths, explain a failed request, summarize the last day of traffic, or produce sample calls in cURL, JavaScript, and Python. The explanation of a failure is split into facts that NexGate actually stored and suggestions that the model is guessing. Sample calls always show the text YOUR_API_KEY rather than a real key. The Google credential that pays for these answers stays on the server, in the environment file, and is never placed in the website."
        )
    )

    story.append(P("The screens", "h2"))
    story.append(
        bullets(
            [
                "Overview shows counts of calls, successes, failures, and average time for the current organization.",
                "APIs is where a provider registers and publishes a service.",
                "Applications and API Keys are where a developer creates a program and its credential.",
                "Analytics and Request Logs show traffic and the record of each call.",
                "API Docs and Playground are for reading a service and trying it.",
                "Subscriptions shows plans. Webhooks is the list of addresses that should be notified when something changes.",
                "Settings holds the profile name and the password change. The password form asks for the new password and a confirmation.",
                "AI Assistant holds the four Gemini jobs.",
            ]
        )
    )

    story.append(P("2. Technical working"))
    story.append(
        P(
            "NexGate is two Node.js programs and two data services. The website is a React 18 application built with Vite and Tailwind CSS. It runs on port 5173 during development and talks to the API with cookies. The server is Express 4 on port 3000. Prisma talks to PostgreSQL. Redis counts rate limits and Gemini usage. If Redis is down, those counters fall back to memory inside the API process. Zod checks incoming JSON. Passwords are hashed with bcrypt. Sessions are signed JWTs stored in an HTTP-only cookie named nexgate_token."
        )
    )

    story.append(P("Processes and addresses", "h2"))
    story.append(
        table(
            ["Process", "Address in local development", "Role"],
            [
                ["React portal", "http://localhost:5173", "Screens, forms, and the playground."],
                ["Express API", "http://localhost:3000", "Accounts, organizations, gateway, mocks, and Gemini."],
                ["PostgreSQL 16", "localhost:5432, database nexgate", "Users, APIs, keys, plans, logs, webhooks."],
                ["Redis 7", "localhost:6379", "Rate-limit windows, JWT revocation, Gemini daily counts."],
                ["Gemini", "Google Generative Language API", "Documentation, explanations, insights, and example notes."],
            ],
            [36 * mm, 62 * mm, 76 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        P(
            "The management API lives under /api/v1. The proxy lives under /gateway/:apiSlug/:version/*. Sample upstreams live under /mock-upstream. GET /health says the process is up. GET /health/ready also asks PostgreSQL whether it can answer."
        )
    )

    story.append(P("What is stored", "h2"))
    story.append(
        P(
            "A user has an email, a name, and a password hash. An organization has a name and a unique slug. Membership joins a user to an organization with a role: OWNER, ADMIN, MEMBER, or DEVELOPER. An API belongs to one organization and points at one upstream base URL. It has versions and endpoints. An application belongs to one organization. An API key stores a prefix and a SHA-256 hash of the full key, never the full key. A plan stores per-minute, daily, and monthly quotas. A subscription ties one application to one plan on one API. Each gateway call can become a request log with method, path, status, latency, and a request id. Usage rows summarize counts by hour."
        )
    )

    story.append(P("Sign-in, roles, and the demo flag", "h2"))
    story.append(
        P(
            "Registration creates the user, an organization, and one membership in a single database transaction. Choosing Publish APIs stores the role OWNER. Choosing Consume APIs stores the role DEVELOPER. A developer can create applications and keys. Publishing and deleting APIs requires OWNER or ADMIN. Login checks the password hash and sets the cookie. Logout blacklists the token id in Redis when Redis is connected, then clears the cookie."
        )
    )
    story.append(
        P(
            "Instant Demo calls POST /api/v1/auth/demo. That handler creates or reuses one visitor user and the organization whose slug is public-demo. The issued JWT contains demo set to true. A middleware named denyDemoMutation reads that flag on every write. The demo session may read its own organization, call /gateway, call the assistant, log out, and reset demo traffic. Creating an API, a key, a webhook, or an organization change returns HTTP 403 before the route handler runs. The demo user is removed from every organization except public-demo, so the session cannot open a registered user’s data. Password login is refused for the reserved demo email."
        )
    )

    story.append(P("Path of one gateway call", "h2"))
    story.append(
        bullets(
            [
                "The client sends the method, path, and header X-API-Key to /gateway/&lt;slug&gt;/&lt;version&gt;/&lt;path&gt;.",
                "The server hashes the key and loads the matching row. A missing, malformed, or revoked key is rejected.",
                "The application must have an active subscription to that API. The plan supplies the quotas. Empty scopes allow every method. A listed scope such as GET /current limits the key.",
                "Redis, or the memory fallback, applies the per-minute window and the daily and monthly quotas. A full quota returns 429.",
                "The upstream URL is checked for private and link-local addresses. Loopback is allowed only when ALLOW_LOCAL_UPSTREAM is true, which the local sample APIs need. The resolved address is pinned so the connection cannot be redirected to another host.",
                "The request is forwarded with a timeout. Hop-by-hop headers, the cookie, and the caller’s authorization headers are not forwarded. The upstream body is size-limited.",
                "The status and latency are written to a request log, and the hourly usage row is updated. The upstream body is returned to the caller.",
            ]
        )
    )
    story.append(
        P(
            "The built-in samples are GET /mock-upstream/weather/current and GET /mock-upstream/catalog/products. The demo organization publishes them as demo-weather and demo-catalog. The sandbox key is derived on the server from JWT_SECRET, and only its hash is stored. The playground receives that key for the current browser session and labels it as a sandbox credential."
        )
    )

    story.append(P("Gemini", "h2"))
    story.append(
        P(
            "GEMINI_API_KEY is read only by the API process from the project .env file. The module backend/src/modules/ai/gemini.ts posts to the Generative Language API using the model named by GEMINI_MODEL, with a timeout and one retry on a temporary failure. Prompts are cut to a fixed length, and strings that look like NexGate keys or bearer tokens are replaced before they are sent. The model is asked for JSON. The server validates that JSON with Zod before the page shows it. Daily counters are DEMO_DAILY_AI_LIMIT for a demo session and USER_DAILY_AI_LIMIT for a registered user. A missing key returns 503 for documentation, explanation, and insights. The example generator still returns local cURL, JavaScript, and Python that contain YOUR_API_KEY."
        )
    )

    story.append(P("Other behavior that is already in the code", "h2"))
    story.append(
        bullets(
            [
                "Password change from Settings sends the new password to PUT /api/v1/auth/me. The form does not ask for the current password.",
                "Forgot password stores a reset token on the user. The project does not send email, so the reset page asks for that token to be pasted.",
                "A webhook row stores a URL and a secret. Deliveries are not posted to that URL by a worker.",
                "Organization name can be saved by PUT /api/v1/organizations/:orgId. The Settings field currently keeps the typed name in the browser until that request is wired.",
                "The documentation page currently draws a fixed GET /current example. The endpoint rows themselves are already returned by the API list.",
            ]
        )
    )

    story.append(P("3. How to start the whole project"))
    story.append(
        P(
            "These steps start PostgreSQL, the API, and the website on this computer. Use the project folder C:\\Users\\yasha\\OneDrive\\Desktop\\API Management Portal. Two terminals are required after the database is up. The website is http://localhost:5173. The API is http://localhost:3000."
        )
    )

    story.append(P("Step 1. Install the runtimes", "h2"))
    story.append(
        bullets(
            [
                "Node.js 18 or newer, with npm.",
                "PostgreSQL 16 listening on port 5432.",
                "Redis 7 on port 6379 is optional. Without it, rate limits and Gemini counts stay in the API process, and logout cannot revoke a token on another machine.",
            ]
        )
    )
    story.append(
        P(
            "If Docker is installed and available in the terminal, the database and Redis start together from the project folder:"
        )
    )
    story.append(
        code_block(
            "cd \"C:\\Users\\yasha\\OneDrive\\Desktop\\API Management Portal\"\n"
            "docker compose up -d"
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        P(
            "If Docker is not available, start a local PostgreSQL service so that localhost port 5432 accepts connections. The connection string in .env must match that server. The copy of .env in this folder already points at postgresql://nexgate:nexgate_dev_password@localhost:5432/nexgate. Create that database and user if they do not exist, or change DATABASE_URL to the server you actually run."
        )
    )

    story.append(P("Step 2. Environment file", "h2"))
    story.append(
        P(
            "From the project folder, copy the example file if .env is missing. This folder already has a .env. Leave secrets out of git."
        )
    )
    story.append(
        code_block(
            "cd \"C:\\Users\\yasha\\OneDrive\\Desktop\\API Management Portal\"\n"
            "copy .env.example .env"
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        P(
            "ALLOW_LOCAL_UPSTREAM must be true for the sample Weather and Catalog APIs, because their upstream is this same API process. To turn on the assistant, set GEMINI_API_KEY in that same .env file to a key from Google AI Studio. Restart the API after any change to .env. Do not put that key in a frontend file or in a variable whose name starts with VITE_."
        )
    )

    story.append(P("Step 3. Prepare and start the API", "h2"))
    story.append(
        P(
            "Open the first terminal in the backend folder. Install packages, generate the Prisma client, create the tables, then start the API in watch mode."
        )
    )
    story.append(
        code_block(
            "cd \"C:\\Users\\yasha\\OneDrive\\Desktop\\API Management Portal\\backend\"\n"
            "npm install\n"
            "npx prisma generate\n"
            "npx prisma db push\n"
            "npm run dev"
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        P(
            "Leave this terminal open. A healthy start prints that the server is on http://localhost:3000. If the log says it cannot reach localhost:5432, PostgreSQL is not running and the later pages will show “The database is unavailable.” GET http://localhost:3000/health should return status healthy. GET http://localhost:3000/health/ready returns ready only when the database answers."
        )
    )

    story.append(P("Step 4. Start the website", "h2"))
    story.append(P("Open a second terminal and start Vite."))
    story.append(
        code_block(
            "cd \"C:\\Users\\yasha\\OneDrive\\Desktop\\API Management Portal\\frontend\"\n"
            "npm install\n"
            "npm run dev"
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        P(
            "Leave this terminal open as well. Vite prints http://localhost:5173. During development, the website proxies /api, /gateway, and /mock-upstream to port 3000, so the playground can call the gateway on the same origin."
        )
    )

    story.append(P("Step 5. Open the product", "h2"))
    story.append(
        bullets(
            [
                "Open http://localhost:5173 in a browser.",
                "Choose Instant Demo to enter the sample workspace without an account. The first visit creates the demo organization, the two sample APIs, the plans, the application, and the sample log rows.",
                "Or choose Full Registration at /auth/register. Publish APIs creates an owner. Consume APIs creates a developer. Sign-in remains at /login.",
                "From the demo or a developer account, open Playground, keep the sandbox or generated key, and send GET current on the weather API or GET products on the catalog API.",
                "Open Request Logs to see the call. Open AI Assistant only after GEMINI_API_KEY is set.",
            ]
        )
    )

    story.append(P("Optional checks", "h2"))
    story.append(
        code_block(
            "cd \"C:\\Users\\yasha\\OneDrive\\Desktop\\API Management Portal\\backend\"\n"
            "npm test"
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        P(
            "The backend test command runs the unit and gateway tests. A second way to start both programs, after the database tables exist, is from the project folder: npm install once, then npm run dev. That script starts the API and the website together. The database must already be running, and prisma db push must already have been applied."
        )
    )

    story.append(P("Stop", "h2"))
    story.append(
        P(
            "Stop each terminal with Ctrl+C. If Docker started the data services, stop them from the project folder with docker compose down. That command stops the containers and does not delete the database volume."
        )
    )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title="NexGate — How the project works",
        author="NexGate",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    build()
