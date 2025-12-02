# src/models/architecture.py
from tensorflow.keras import layers, models

def build_cnn(input_shape=(128,128,3), num_classes=2):
    """
    Architecture CNN simple similaire à ton notebook.
    Retourne un modèle compilé (non compilé ici pour permettre flexibilité).
    """
    model = models.Sequential([
        layers.Conv2D(32, (3,3), activation='relu', padding='same', input_shape=input_shape),
        layers.MaxPooling2D((2,2)),

        layers.Conv2D(64, (3,3), activation='relu', padding='same'),
        layers.MaxPooling2D((2,2)),

        layers.Conv2D(128, (3,3), activation='relu', padding='same'),
        layers.MaxPooling2D((2,2)),

        layers.Flatten(),
        layers.Dense(256, activation='relu'),
        layers.Dropout(0.4),
        layers.Dense(num_classes, activation='softmax')
    ])
    return model
