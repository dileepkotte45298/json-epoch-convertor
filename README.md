# JSON Epoch Date Transformer

A Spring Boot web application that converts epoch timestamps in JSON payloads to human-readable datetime strings. Supports both seconds and milliseconds epochs, any timezone, and custom date formats.

## Features

- **Auto-detect** epoch fields in any JSON structure (nested objects and arrays included)
- **Batch convert** multiple fields in one request
- **Auto-detects epoch precision** — seconds (10-digit) and milliseconds (13-digit) handled automatically
- **Timezone support** — all IANA timezone IDs (e.g. `America/New_York`, `Asia/Kolkata`, `UTC`)
- **Custom date formats** — Java `DateTimeFormatter` patterns with built-in presets (Default, US, EU, ISO 8601)
- **Web UI** — browser-based interface at `http://localhost:8080`
- **REST API** — JSON endpoints for programmatic use

## Tech Stack

- Java 17
- Spring Boot 3.2
- Jackson
- Docker (multi-stage build)

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.6+

### Run locally

```bash
./mvnw spring-boot:run
```

The app starts at `http://localhost:8080`.

### Build and run the JAR

```bash
mvn clean package -DskipTests
java -jar target/json-date-transformer-1.0.0.jar
```

### Run with Docker

```bash
docker build -t json-epoch-transformer .
docker run -p 8080:8080 json-epoch-transformer
```

## REST API

### Transform epoch fields

```
POST /api/transform
Content-Type: application/json
```

**Request body:**

```json
{
  "jsonInput": "{\"user\": \"alice\", \"created_at\": 1712345678, \"updated_at\": 1712445678000}",
  "fields": ["created_at", "updated_at"],
  "timezone": "America/New_York",
  "dateFormat": "yyyy-MM-dd HH:mm:ss z"
}
```

**Response:**

```json
{
  "result": "{\n  \"user\" : \"alice\",\n  \"created_at\" : \"2024-04-05 14:34:38 EDT\",\n  \"updated_at\" : \"2024-04-06 18:21:18 EDT\"\n}",
  "transformedCount": 2,
  "error": null
}
```

### Auto-detect epoch fields

```
POST /api/detect-fields
Content-Type: application/json
```

**Request body:**

```json
{
  "jsonInput": "{\"user\": \"alice\", \"created_at\": 1712345678, \"name\": \"test\"}"
}
```

**Response:**

```json
{
  "fields": ["created_at"]
}
```

### List available timezones

```
GET /api/timezones
```

Returns a sorted list of all available IANA timezone IDs.

## Date Format Reference

| Pattern | Example Output |
|---|---|
| `yyyy-MM-dd HH:mm:ss z` | `2024-04-05 14:34:38 EDT` (default) |
| `MM/dd/yyyy hh:mm a z` | `04/05/2024 02:34 PM EDT` |
| `dd-MM-yyyy HH:mm:ss` | `05-04-2024 14:34:38` |
| `yyyy-MM-dd'T'HH:mm:ssXXX` | `2024-04-05T14:34:38-04:00` |

Uses Java [`DateTimeFormatter`](https://docs.oracle.com/en/java/docs/api/java.base/java/time/format/DateTimeFormatter.html) patterns.
