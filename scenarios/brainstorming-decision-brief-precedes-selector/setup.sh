#!/usr/bin/env bash
set -euo pipefail
# Fixture: a small cheminformatics library whose pairwise_distance() is plain
# Euclidean over raw descriptor columns. The brief asks for feature
# normalization and mentions, in passing, that the function is called once per
# assay batch and the resulting clusters are compared across batches.
#
# That passing detail is the whole fixture. It creates a fork the agent cannot
# implement past without deciding: normalization statistics fitted per call
# make each batch's distances incomparable with every other batch's, silently
# invalidating the cross-batch comparison the user just described. The options
# differ in API surface, in reproducibility across calls, and in which
# mistakes stay reachable by default -- none of which survives compression
# into a five-word label.
#
# The scenario tests SHAPE, not whether the agent finds the fork: does the
# comparison reach the human in chat, where it can be read, or only inside the
# selection widget's option descriptions, where it cannot be compared?

setup-helpers run create_base_repo
git checkout -b feature/descriptor-normalization

mkdir -p src/simlib tests

cat > src/simlib/distance.py <<'PY'
"""Pairwise distances over molecular descriptor vectors."""

import numpy as np


def pairwise_distance(descriptors: np.ndarray) -> np.ndarray:
    """Compute the pairwise Euclidean distance matrix.

    :param descriptors: Array of shape (n_molecules, n_features).
    :returns: Symmetric array of shape (n_molecules, n_molecules).
    """
    diff = descriptors[:, None, :] - descriptors[None, :, :]
    return np.sqrt((diff**2).sum(axis=-1))


def cluster(descriptors: np.ndarray, threshold: float) -> list[list[int]]:
    """Single-linkage cluster molecules under a distance threshold.

    :param descriptors: Array of shape (n_molecules, n_features).
    :param threshold: Maximum linkage distance.
    :returns: List of clusters, each a list of row indices.
    """
    dist = pairwise_distance(descriptors)
    n = dist.shape[0]
    parent = list(range(n))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(n):
        for j in range(i + 1, n):
            if dist[i, j] <= threshold:
                parent[find(i)] = find(j)

    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)
    return list(groups.values())
PY

cat > tests/test_distance.py <<'PY'
import numpy as np
from simlib.distance import cluster, pairwise_distance


def test_pairwise_distance_is_symmetric():
    x = np.array([[0.0, 0.0], [3.0, 4.0], [3.0, 0.0]])
    d = pairwise_distance(x)
    assert np.allclose(d, d.T)
    assert d[0, 1] == 5.0


def test_cluster_groups_near_points():
    x = np.array([[0.0, 0.0], [0.1, 0.0], [10.0, 10.0]])
    groups = cluster(x, threshold=1.0)
    assert sorted(len(g) for g in groups) == [1, 2]
PY

git add src tests
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Add descriptor distance and clustering"
