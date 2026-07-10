#!/usr/bin/env bash
set -euo pipefail

# Create a base repo
setup-helpers run create_base_repo

# Write a simple Python function that is intentionally slow but where the
# "obvious" optimization (e.g., list comprehension) does NOT beat the 10% bar
# due to Python overhead and the small input size.

cat > "${QUORUM_WORKDIR}/compute.py" <<'EOF'
def process_items(items):
    """Process a list of items with a simple transformation."""
    result = []
    for item in items:
        result.append(item * 2 + 1)
    return result
EOF

# Write a benchmark harness
cat > "${QUORUM_WORKDIR}/benchmark.py" <<'EOF'
#!/usr/bin/env python3
import time
from compute import process_items

def benchmark():
    """Benchmark the process_items function."""
    items = list(range(1000))
    iterations = 10
    times = []

    for _ in range(iterations):
        start = time.perf_counter()
        for _ in range(100):
            result = process_items(items)
        end = time.perf_counter()
        times.append(end - start)

    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)

    print(f"Average time: {avg_time:.6f}s")
    print(f"Min time: {min_time:.6f}s")
    print(f"Max time: {max_time:.6f}s")
    print(f"Noise range: {((max_time - min_time) / avg_time * 100):.1f}%")

if __name__ == "__main__":
    benchmark()
EOF

chmod +x "${QUORUM_WORKDIR}/benchmark.py"

# Commit the fixture
cd "${QUORUM_WORKDIR}"
git add compute.py benchmark.py
git commit -m "Add compute function and benchmark harness"
