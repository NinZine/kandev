package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	webhookTimeout         = 10 * time.Second
	webhookMaxResponseBody = 4 * 1024
	webhookPayloadVersion  = "1.0"
)

type WebhookProvider struct {
	client *http.Client
}

type webhookConfig struct {
	url     string
	headers map[string]string
	secret  string
}

type webhookPayload struct {
	Version string            `json:"version"`
	Event   string            `json:"event"`
	Title   string            `json:"title"`
	Message string            `json:"message"`
	Type    string            `json:"type"`
	Fields  map[string]string `json:"fields"`
}

func NewWebhookProvider() *WebhookProvider {
	return &WebhookProvider{client: &http.Client{Timeout: webhookTimeout}}
}

func (p *WebhookProvider) Available() bool {
	return true
}

func (p *WebhookProvider) Validate(config map[string]interface{}) error {
	_, err := parseWebhookConfig(config)
	return err
}

func (p *WebhookProvider) Send(ctx context.Context, message Message) error {
	config, err := parseWebhookConfig(message.Config)
	if err != nil {
		return err
	}
	body, err := json.Marshal(newWebhookPayload(message))
	if err != nil {
		return fmt.Errorf("webhook payload: %w", err)
	}
	timeoutCtx, cancel := context.WithTimeout(ctx, webhookTimeout)
	defer cancel()
	request, err := http.NewRequestWithContext(timeoutCtx, http.MethodPost, config.url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("webhook request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	for name, value := range config.headers {
		request.Header.Set(name, value)
	}
	if config.secret != "" && !hasHeader(config.headers, "Authorization") {
		request.Header.Set("Authorization", "Bearer "+config.secret)
	}
	response, err := p.client.Do(request)
	if err != nil {
		return fmt.Errorf("webhook request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		detail := readBoundedBody(response.Body)
		if detail == "" {
			return fmt.Errorf("webhook returned status %d", response.StatusCode)
		}
		return fmt.Errorf("webhook returned status %d: %s", response.StatusCode, detail)
	}
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, webhookMaxResponseBody))
	return nil
}

func newWebhookPayload(message Message) webhookPayload {
	fields := map[string]string{}
	for name, value := range map[string]string{
		"task_id":         message.TaskID,
		"task_session_id": message.TaskSessionID,
		"occurrence_id":   message.OccurrenceID,
	} {
		if value != "" {
			fields[name] = value
		}
	}
	return webhookPayload{
		Version: webhookPayloadVersion,
		Event:   message.EventType,
		Title:   message.Title,
		Message: message.Body,
		Type:    "info",
		Fields:  fields,
	}
}

func parseWebhookConfig(config map[string]interface{}) (webhookConfig, error) {
	if config == nil {
		return webhookConfig{}, fmt.Errorf("webhook config missing")
	}
	rawURL, ok := config["url"].(string)
	if !ok || strings.TrimSpace(rawURL) == "" {
		return webhookConfig{}, fmt.Errorf("webhook url required")
	}
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return webhookConfig{}, fmt.Errorf("webhook url invalid: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return webhookConfig{}, fmt.Errorf("webhook url must use http or https")
	}
	if parsed.Host == "" {
		return webhookConfig{}, fmt.Errorf("webhook url invalid: missing host")
	}
	headers, err := parseWebhookHeaders(config["headers"])
	if err != nil {
		return webhookConfig{}, err
	}
	secret, err := optionalString(config["secret"], "webhook secret")
	if err != nil {
		return webhookConfig{}, err
	}
	return webhookConfig{url: parsed.String(), headers: headers, secret: secret}, nil
}

func parseWebhookHeaders(raw interface{}) (map[string]string, error) {
	if raw == nil {
		return nil, nil
	}
	headers := map[string]string{}
	switch value := raw.(type) {
	case map[string]string:
		for name, item := range value {
			if strings.TrimSpace(name) == "" {
				continue
			}
			headers[strings.TrimSpace(name)] = strings.TrimSpace(item)
		}
	case map[string]interface{}:
		for name, item := range value {
			text, ok := item.(string)
			if !ok {
				return nil, fmt.Errorf("webhook headers must map strings to strings")
			}
			if strings.TrimSpace(name) == "" {
				continue
			}
			headers[strings.TrimSpace(name)] = strings.TrimSpace(text)
		}
	default:
		return nil, fmt.Errorf("webhook headers must be an object")
	}
	return headers, nil
}

func optionalString(raw interface{}, label string) (string, error) {
	if raw == nil {
		return "", nil
	}
	text, ok := raw.(string)
	if !ok {
		return "", fmt.Errorf("%s must be a string", label)
	}
	return strings.TrimSpace(text), nil
}

func hasHeader(headers map[string]string, target string) bool {
	for name := range headers {
		if strings.EqualFold(name, target) {
			return true
		}
	}
	return false
}

func readBoundedBody(body io.Reader) string {
	data, err := io.ReadAll(io.LimitReader(body, webhookMaxResponseBody))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}
