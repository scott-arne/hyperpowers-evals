#!/usr/bin/env bash
set -euo pipefail

# Create a base repo
setup-helpers run create_base_repo

# Write a Python script with a non-obvious bottleneck: most of the time is spent
# in a logging/formatting function that gets called many times, not in the
# "compute-heavy looking" function.

cat > "${QUORUM_WORKDIR}/analyzer.py" <<'EOF'
#!/usr/bin/env python3
import time

def format_log(msg, level="INFO"):
    """Format a log message with timestamp and level."""
    # Intentionally slow: recreate the timestamp format string every time
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    return f"[{timestamp}] {level}: {msg}"

def compute_heavy_task(n):
    """A function that looks compute-heavy but is actually fast."""
    total = 0
    for i in range(n):
        total += i * 2
    return total

def process_data(items):
    """Process data with logging."""
    results = []
    for i, item in enumerate(items):
        # Log every single item (the real bottleneck)
        log_msg = format_log(f"Processing item {i}: {item}")
        result = compute_heavy_task(item)
        results.append(result)
    return results

def main():
    """Run the analyzer."""
    print("Starting analysis...")
    data = list(range(1, 1001))
    results = process_data(data)
    print(f"Processed {len(results)} items")

if __name__ == "__main__":
    main()
EOF

chmod +x "${QUORUM_WORKDIR}/analyzer.py"

# Commit the fixture
cd "${QUORUM_WORKDIR}"
git add analyzer.py
git commit -m "Add analyzer script with performance issue"
