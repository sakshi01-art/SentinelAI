# SentinelAI Architecture

## Overview
SentinelAI is designed as a modular security event analysis application.

## Data Flow
1. A user or trusted data source submits a security event.
2. The backend validates and normalizes the event.
3. Analysis components calculate a transparent risk result.
4. The dashboard presents the result and its explanation.

## Planned Components
- Frontend dashboard
- Backend API
- Event analysis service
- Event history storage
- Testing layer

## Design Goals
- Clear and explainable results
- Modular code
- Defensive use only
- Easy local development