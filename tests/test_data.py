# tests/test_data.py
import os
import numpy as np
from src.data.preprocessing import load_full_dataset

def test_load_full_dataset_basic():
    # This test asserts that function returns arrays and no exception
    X, y, bad = load_full_dataset()
    assert isinstance(X, np.ndarray)
    assert isinstance(y, np.ndarray)
    assert X.shape[0] == y.shape[0]
    # Channels should be 3
    if X.shape[0] > 0:
        assert X.shape[3] == 3
