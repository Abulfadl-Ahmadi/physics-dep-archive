#!/usr/bin/env python3
"""Fix the batch_upload.py secret key line"""
with open('batch_upload.py', 'r') as f:
    content = f.read()

# Find and fix the problematic line
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'ARVAN_SECRET_KEY' in line and 'os.getenv' not in line:
        # This is the broken line - replace with proper env var access
        lines[i] = 'ARVAN_SECRET_KEY = os.getenv("ARVAN_SECRET_KEY")'
        print(f'Fixed line {i+1}')
        break
    elif 'ARVAN_SECRET_KEY' in line and 'os.getenv' in line and i < 30:
        # Already correct
        print(f'Line {i+1} is already correct: {line}')
        break

with open('batch_upload.py', 'w') as f:
    f.write('\n'.join(lines))

print('Done')
