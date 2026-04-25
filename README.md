# JSON Epoch Converter

A free online tool to convert Unix/epoch timestamps embedded inside JSON data into human-readable dates — **entirely in the browser**. Your JSON never leaves your device.

Live at: **[jsonepochconverter.org](https://jsonepochconverter.org)**

## Features

- **100% client-side processing** — no data sent to any server; all conversion runs in browser JavaScript
- **Auto-detect epoch fields** — recursively walks any JSON structure to find timestamp fields
- **All epoch precisions supported:**
  - Seconds (10-digit)
  - Milliseconds (13-digit)
  - Microseconds (16-digit)
  - Nanoseconds (19-digit, uses `BigInt` for precision)
- **600+ IANA timezones** — loaded via `Intl.supportedValuesOf('timeZone')` with full DST support
- **Custom date formats** — presets for Default, US, EU, ISO 8601, or define your own pattern
- **Upload & drag-drop** — supports `.json` files up to 50 MB
- **Collapsible JSON tree** output with expand/collapse all
- **Copy & download** converted JSON

## Privacy

JSON Epoch Converter processes everything in your browser. When you click Transform:

- Zero network requests are made for the conversion
- Your JSON is never uploaded, stored, or logged anywhere
- Data stays in your browser's memory and is discarded when you close the tab

You can verify this by opening DevTools → Network tab and observing no API calls during transform.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17 / Spring Boot 3.2 (serves static files only) |
| Frontend | Vanilla HTML, CSS, JavaScript (no frameworks) |
| Epoch conversion | Browser `Intl.DateTimeFormat` + `BigInt` |
| Timezones | `Intl.supportedValuesOf('timeZone')` |
| Deployment | Google Cloud Run + Cloudflare CDN |
| Container | Docker (multi-stage, Java 21 + ZGC) |

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.6+

### Run locally

```bash
./mvnw spring-boot:run
```

App starts at `http://localhost:8080`.

### Build and run the JAR

```bash
mvn clean package -DskipTests
java -jar target/json-date-transformer-1.0.0.jar
```

### Run with Docker

```bash
docker build -t json-epoch-converter .
docker run -p 8080:8080 json-epoch-converter
```

## Date Format Reference

The date format field uses standard `DateTimeFormatter`-style tokens, interpreted client-side:

| Token | Description | Example |
|---|---|---|
| `yyyy` | 4-digit year | `2024` |
| `MM` | 2-digit month | `04` |
| `dd` | 2-digit day | `05` |
| `HH` | 24-hour hour | `14` |
| `hh` | 12-hour hour | `02` |
| `mm` | Minutes | `34` |
| `ss` | Seconds | `38` |
| `a` | AM/PM | `PM` |
| `z` | Timezone short name | `EDT` |
| `XXX` | ISO 8601 offset | `+05:30` |

**Built-in presets:**

| Preset | Pattern | Example Output |
|---|---|---|
| Default | `yyyy-MM-dd HH:mm:ss z` | `2024-04-05 14:34:38 EDT` |
| US | `MM/dd/yyyy hh:mm a z` | `04/05/2024 02:34 PM EDT` |
| EU | `dd-MM-yyyy HH:mm:ss` | `05-04-2024 14:34:38` |
| ISO 8601 | `yyyy-MM-dd'T'HH:mm:ssXXX` | `2024-04-05T14:34:38-04:00` |

## Sample JSON for Testing

```json
{
  "user": "alice",
  "created_at": 1712345678,
  "updated_at": 1712445678000,
  "event_us": 1712345678123456,
  "event_ns": "1712345678123456789"
}
```

## Backend API

The Spring Boot backend exposes REST endpoints that the UI no longer calls (all processing moved client-side), but they remain available for programmatic use:

### POST /api/transform

```json
{
  "jsonInput": "{\"created_at\": 1712345678}",
  "fields": ["created_at"],
  "timezone": "America/New_York",
  "dateFormat": "yyyy-MM-dd HH:mm:ss z"
}
```

### POST /api/detect-fields

```json
{
  "jsonInput": "{\"created_at\": 1712345678, \"name\": \"test\"}"
}
```

### GET /api/timezones

Returns a sorted list of all available IANA timezone IDs.

## Contributors

- **Dileep** — creator & maintainer
