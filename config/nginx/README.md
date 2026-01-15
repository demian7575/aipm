# Nginx Configuration

This directory contains nginx reverse proxy configurations for AIPM environments.

## Files

- `api-proxy.conf` - Production environment (port 8081)
- `aipm-dev.conf` - Development environment (port 8081)

## Deployment

### Production
```bash
sudo cp config/nginx/api-proxy.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx
```

### Development
```bash
sudo cp config/nginx/aipm-dev.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx
```

## Port Configuration

Both environments proxy to **port 8081** where the kiro-api-server runs.

The old backend on port 4000 is deprecated.
