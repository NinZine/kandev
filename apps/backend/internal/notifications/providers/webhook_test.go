package providers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestWebhookValidate(t *testing.T) {
	provider := NewWebhookProvider()
	cases := []struct {
		name    string
		config  map[string]interface{}
		wantErr bool
	}{
		{name: "valid", config: map[string]interface{}{"url": "https://example.test/hooks/kandev"}},
		{name: "valid with headers and secret", config: map[string]interface{}{
			"url":     "http://example.test/hooks/kandev",
			"headers": map[string]interface{}{"X-Tenant": "acme"},
			"secret":  "token",
		}},
		{name: "missing config", config: nil, wantErr: true},
		{name: "missing url", config: map[string]interface{}{}, wantErr: true},
		{name: "blank url", config: map[string]interface{}{"url": "  "}, wantErr: true},
		{name: "invalid url", config: map[string]interface{}{"url": "://not-a-url"}, wantErr: true},
		{name: "unsupported scheme", config: map[string]interface{}{"url": "ftp://example.test"}, wantErr: true},
		{name: "missing host", config: map[string]interface{}{"url": "http://"}, wantErr: true},
		{name: "non string url", config: map[string]interface{}{"url": 42}, wantErr: true},
		{name: "non object headers", config: map[string]interface{}{"url": "https://example.test", "headers": "X-Test: value"}, wantErr: true},
		{name: "non string header value", config: map[string]interface{}{"url": "https://example.test", "headers": map[string]interface{}{"X-Test": 1}}, wantErr: true},
		{name: "non string secret", config: map[string]interface{}{"url": "https://example.test", "secret": 1}, wantErr: true},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			err := provider.Validate(testCase.config)
			if testCase.wantErr && err == nil {
				t.Fatalf("expected validation error")
			}
			if !testCase.wantErr && err != nil {
				t.Fatalf("unexpected validation error: %v", err)
			}
		})
	}
}

func TestWebhookSendPayloadHeadersAndSecret(t *testing.T) {
	type captured struct {
		headers http.Header
		body    webhookPayload
	}
	received := make(chan captured, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload webhookPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Errorf("decode payload: %v", err)
		}
		received <- captured{headers: r.Header.Clone(), body: payload}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()

	provider := NewWebhookProvider()
	err := provider.Send(context.Background(), Message{
		EventType:     "session.turn_finished",
		Title:         "Agent turn finished",
		Body:          "The agent finished a turn.",
		TaskID:        "task-1",
		TaskSessionID: "session-1",
		OccurrenceID:  "occurrence-1",
		UserID:        "user-1",
		Config: map[string]interface{}{
			"url":     server.URL,
			"headers": map[string]interface{}{"X-Tenant": "acme"},
			"secret":  "gateway-token",
		},
	})
	if err != nil {
		t.Fatalf("send: %v", err)
	}
	result := <-received
	if result.headers.Get("Content-Type") != "application/json" {
		t.Fatalf("content type = %q", result.headers.Get("Content-Type"))
	}
	if result.headers.Get("X-Tenant") != "acme" {
		t.Fatalf("custom header = %q", result.headers.Get("X-Tenant"))
	}
	if result.headers.Get("Authorization") != "Bearer gateway-token" {
		t.Fatalf("authorization = %q", result.headers.Get("Authorization"))
	}
	if result.body.Version != "1.0" || result.body.Event != "session.turn_finished" ||
		result.body.Title != "Agent turn finished" || result.body.Message != "The agent finished a turn." ||
		result.body.Type != "info" {
		t.Fatalf("unexpected payload: %+v", result.body)
	}
	wantFields := map[string]string{
		"task_id":         "task-1",
		"task_session_id": "session-1",
		"occurrence_id":   "occurrence-1",
	}
	if len(result.body.Fields) != len(wantFields) {
		t.Fatalf("fields = %+v", result.body.Fields)
	}
	for key, value := range wantFields {
		if result.body.Fields[key] != value {
			t.Fatalf("field %s = %q, want %q", key, result.body.Fields[key], value)
		}
	}
	if _, ok := result.body.Fields["user_id"]; ok {
		t.Fatalf("payload must not include user identifiers")
	}
}

func TestWebhookSendOmitsEmptyFields(t *testing.T) {
	received := make(chan webhookPayload, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload webhookPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Errorf("decode payload: %v", err)
		}
		received <- payload
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	provider := NewWebhookProvider()
	if err := provider.Send(context.Background(), Message{
		EventType: "session.clarification_requested",
		Title:     "Test notification",
		Body:      "test",
		Config:    map[string]interface{}{"url": server.URL},
	}); err != nil {
		t.Fatalf("send: %v", err)
	}
	payload := <-received
	if len(payload.Fields) != 0 {
		t.Fatalf("fields = %+v, want empty", payload.Fields)
	}
}

func TestWebhookSendHonorsConfiguredAuthorizationHeader(t *testing.T) {
	received := make(chan http.Header, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received <- r.Header.Clone()
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	provider := NewWebhookProvider()
	if err := provider.Send(context.Background(), Message{
		EventType: "session.turn_finished",
		Config: map[string]interface{}{
			"url":     server.URL,
			"headers": map[string]interface{}{"authorization": "Token explicit"},
			"secret":  "ignored-secret",
		},
	}); err != nil {
		t.Fatalf("send: %v", err)
	}
	if got := (<-received).Get("Authorization"); got != "Token explicit" {
		t.Fatalf("authorization = %q", got)
	}
}

func TestWebhookSendNon2xxReturnsBoundedBody(t *testing.T) {
	longBody := strings.Repeat("x", webhookMaxResponseBody*2)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(longBody))
	}))
	defer server.Close()

	provider := NewWebhookProvider()
	err := provider.Send(context.Background(), Message{
		EventType: "session.turn_finished",
		Config:    map[string]interface{}{"url": server.URL},
	})
	if err == nil {
		t.Fatal("expected non-2xx error")
	}
	message := err.Error()
	if !strings.Contains(message, "502") {
		t.Fatalf("error = %q", message)
	}
	if len(message) > webhookMaxResponseBody+128 {
		t.Fatalf("error body not bounded: %d bytes", len(message))
	}
}

func TestWebhookSendTimesOut(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(500 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	provider := NewWebhookProvider()
	provider.client = &http.Client{Timeout: 20 * time.Millisecond}
	if err := provider.Send(context.Background(), Message{
		EventType: "session.turn_finished",
		Config:    map[string]interface{}{"url": server.URL},
	}); err == nil {
		t.Fatal("expected timeout error")
	}
}

func TestWebhookSendRejectsInvalidConfig(t *testing.T) {
	provider := NewWebhookProvider()
	if err := provider.Send(context.Background(), Message{}); err == nil {
		t.Fatal("expected invalid config error")
	}
}
