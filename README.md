# Norvix Builder LTD

Production website for Norvix Builder LTD.

## Domain

Primary domain: `norvixbuilderltd.co.uk`

Recommended Render custom domains:

- `norvixbuilderltd.co.uk`
- `www.norvixbuilderltd.co.uk`

Set the apex domain as primary and redirect `www` to the apex domain.

## Enquiry Email

The contact form posts to `/api/enquiry`. Configure one of these email providers in Render.

### Resend

Use this if `norvixbuilderltd.co.uk` is verified in Resend.

- `RESEND_API_KEY`
- `MAIL_FROM=Norvix Builder <website@norvixbuilderltd.co.uk>`
- `MAIL_TO=info@norvixbuilderltd.co.uk`

### SMTP

Use this if the mailbox provider gives SMTP credentials.

- `SMTP_HOST`
- `SMTP_PORT=587`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM=info@norvixbuilderltd.co.uk`
- `SMTP_TO=info@norvixbuilderltd.co.uk`

## Local Run

```bash
npm install
npm start
```
