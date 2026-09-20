# Defensive Event Triage Guide

SentinelAI uses a simple educational workflow for turning raw security events into understandable information.

## Triage Flow

~~~text
Event → Validate → Classify → Assess Context → Prioritize → Explain → Record
~~~

### Validate
Check that the event has a timestamp, source, event type, and usable fields.

### Classify
Group events into categories such as authentication, configuration, application, or network activity.

### Assess Context
Look at frequency, affected resource, recent related events, and whether the activity is expected in the environment.

### Prioritize
Use consistent severity rules instead of treating every event as equally important.

### Explain
An alert should state what was observed, why it was prioritized, and what information is still missing.

## Safety Boundary

This project is for defensive learning and authorized monitoring. It does not provide instructions for unauthorized access or exploitation.