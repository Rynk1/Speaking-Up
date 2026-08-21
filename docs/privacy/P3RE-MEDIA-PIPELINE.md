# P³RE Media Processing & Metadata Stripping Pipeline

## Overview
Implemented in `server/media/mediaPipeline.ts`:
- **EXIF / GPS Stripping**: Parses JPEG headers and removes APP1 EXIF markers (`0xFFE1`) containing embedded GPS coordinates and camera serial numbers before generating public derivatives.
- **Derivative Files**: Stores sanitized public derivative files in `uploads/public/` while original unredacted files remain immutably stored in `uploads/original/`.
- **Protected Access**: Protected evidence is stored in `uploads/protected/` and accessible only via signed token URLs or authorized institutional sessions.
