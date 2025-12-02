# src/utils/metrics.py
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix

def compute_all_metrics(y_true, y_pred):
    """
    y_true, y_pred as 1D arrays of labels (0/1)
    returns a dict serializable (confusion matrix as list)
    """
    acc = accuracy_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred)
    rec = recall_score(y_true, y_pred)
    cm = confusion_matrix(y_true, y_pred).tolist()

    return {
        "accuracy": float(acc),
        "f1_score": float(f1),
        "precision": float(prec),
        "recall": float(rec),
        "confusion_matrix": cm
    }
