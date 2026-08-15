FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    PLAYWRIGHT_CHROME_PATH=/usr/bin/chromium \
    PDF2DOCX_PYTHON=/opt/paperpilot-venv/bin/python \
    PDF2PPTX_PYTHON=/opt/paperpilot-venv/bin/python \
    PDF2EPUB_PYTHON=/opt/paperpilot-venv/bin/python \
    PDF2XLSX_PYTHON=/opt/paperpilot-venv/bin/python \
    PDF2RTF_PYTHON=/opt/paperpilot-venv/bin/python \
    PDF2SECURE_PYTHON=/opt/paperpilot-venv/bin/python \
    PDF2UNLOCK_PYTHON=/opt/paperpilot-venv/bin/python
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium fonts-noto-cjk libreoffice python3 python3-venv \
    && python3 -m venv /opt/paperpilot-venv \
    && /opt/paperpilot-venv/bin/pip install --no-cache-dir \
      "pdf2docx==0.5.8" "PyMuPDF==1.24.14" "python-pptx==1.0.2" "openpyxl==3.1.5" "pypdf==5.1.0" \
    && rm -rf /var/lib/apt/lists/*
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm prune --omit=dev
USER node
EXPOSE 3000
CMD ["npm", "start"]
