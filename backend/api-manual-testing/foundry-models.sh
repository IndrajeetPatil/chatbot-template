#!/bin/bash
post_chat() {
  curl -X 'POST' \
    'http://localhost:8000/api/v1/chat' \
    -H 'accept: text/plain' \
    -H 'Content-Type: application/json' \
    -d "$1"
}

# valid
post_chat '{
  "messages": [{"role": "user", "parts": [{"type": "text", "text": "what is AI?"}]}],
  "model": "gpt-6-astra",
  "reasoning_effort": "medium"
}'

# invalid: wrong model name
post_chat '{
  "messages": [{"role": "user", "parts": [{"type": "text", "text": "what is AI?"}]}],
  "model": "gpt-bla",
  "reasoning_effort": "medium"
}'

# invalid: wrong reasoning_effort
post_chat '{
  "messages": [{"role": "user", "parts": [{"type": "text", "text": "what is AI?"}]}],
  "model": "gpt-6-astra",
  "reasoning_effort": "HOT"
}'

# invalid: missing text message
post_chat '{
  "messages": [{"role": "user", "parts": [{"type": "text", "text": ""}]}]
}'
