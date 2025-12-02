# src/models/training.py
import os
import mlflow
import mlflow.tensorflow
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from .architecture import build_cnn
from data.dataset import load_data_splits
import numpy as np

# ---------------------------
# 1️⃣ Configuration chemins
# ---------------------------
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # racine du projet
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

MLFLOW_DB = os.path.join(PROJECT_ROOT, "mlflow.db")  # SQLite centralisé
MLFLOW_EXPERIMENT = "parkinson_cnn_experiment"

# ---------------------------
# 2️⃣ Fonction d'entraînement
# ---------------------------
def train_and_log(model_name="cnn_parkinson", epochs=30, batch_size=32, lr=1e-4):
    print("📌 Chargement des données...")
    X_train, X_val, X_test, y_train, y_val, y_test = load_data_splits()
    print(f"✅ Dataset chargé !")
    print(f"X_train: {X_train.shape}, y_train: {y_train.shape}")
    print(f"X_val:   {X_val.shape}, y_val:   {y_val.shape}")
    print(f"X_test:  {X_test.shape}, y_test:  {y_test.shape}")

    # Assurer float32
    X_train, X_val, X_test = X_train.astype("float32"), X_val.astype("float32"), X_test.astype("float32")

    # ---------------------------
    # 3️⃣ Data augmentation
    # ---------------------------
    print("📌 Configuration de la data augmentation...")
    datagen = ImageDataGenerator(
        rotation_range=10,
        width_shift_range=0.05,
        height_shift_range=0.05,
        horizontal_flip=True
    )
    datagen.fit(X_train)

    # ---------------------------
    # 4️⃣ Construction du modèle CNN
    # ---------------------------
    print("📌 Construction du modèle CNN...")
    model = build_cnn(input_shape=X_train.shape[1:], num_classes=2)
    model.compile(
        optimizer=Adam(learning_rate=lr),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )

    # ---------------------------
    # 5️⃣ MLflow configuration
    # ---------------------------
    mlflow.set_tracking_uri(f"sqlite:///{MLFLOW_DB}")
    mlflow.set_experiment(MLFLOW_EXPERIMENT)
    mlflow.tensorflow.autolog()  # ✅ autolog sans artifact_path

    with mlflow.start_run(run_name=model_name):
        print("📌 Début de l'entraînement...")
        history = model.fit(
            datagen.flow(X_train, y_train, batch_size=batch_size),
            validation_data=(X_val, y_val),
            epochs=epochs,
            verbose=1
        )
        print("✅ Entraînement terminé !")

        # ---------------------------
        # 6️⃣ Sauvegarde du modèle local + log artifact
        # ---------------------------
        model_path = os.path.join(MODELS_DIR, f"{model_name}.h5")
        model.save(model_path)
        mlflow.log_artifact(model_path, artifact_path="models")
        print(f"✅ Modèle sauvegardé : {model_path}")

        # ---------------------------
        # 7️⃣ Évaluation sur le test set
        # ---------------------------
        loss, acc = model.evaluate(X_test, y_test, verbose=0)
        mlflow.log_metric("test_loss", float(loss))
        mlflow.log_metric("test_accuracy", float(acc))
        print(f"📌 Test Loss: {loss:.4f}, Test Accuracy: {acc:.4f}")

    return {"test_loss": float(loss), "test_accuracy": float(acc), "model_path": model_path}

# ---------------------------
# 8️⃣ Exécution si script direct
# ---------------------------
if __name__ == "__main__":
    results = train_and_log(epochs=30)  # 30 epochs pour entraînement complet
    print("✅ Résultats finaux :", results)
