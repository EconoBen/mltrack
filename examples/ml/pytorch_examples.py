"""Comprehensive PyTorch examples for mltrack."""

import mlflow
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from torch.utils.data import DataLoader, TensorDataset, random_split

from mltrack import track

# Check if CUDA is available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")


class SimpleNN(nn.Module):
    """Simple feedforward neural network."""

    def __init__(self, input_size, hidden_size, num_classes):
        super(SimpleNN, self).__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.2)
        self.fc2 = nn.Linear(hidden_size, hidden_size // 2)
        self.fc3 = nn.Linear(hidden_size // 2, num_classes)

    def forward(self, x):
        x = self.fc1(x)
        x = self.relu(x)
        x = self.dropout(x)
        x = self.fc2(x)
        x = self.relu(x)
        x = self.fc3(x)
        return x


class CNN(nn.Module):
    """Convolutional Neural Network for image-like data."""

    def __init__(self, num_classes=10):
        super(CNN, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.fc1 = nn.Linear(64 * 7 * 7, 128)
        self.fc2 = nn.Linear(128, num_classes)
        self.dropout = nn.Dropout(0.5)

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = x.view(-1, 64 * 7 * 7)
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        return x


class SimpleRNN(nn.Module):
    """Simple RNN for sequence data."""

    def __init__(self, input_size, hidden_size, num_layers, num_classes):
        super(SimpleRNN, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, num_classes)

    def forward(self, x):
        # Initialize hidden state
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)

        # Forward propagate LSTM
        out, _ = self.lstm(x, (h0, c0))

        # Get last time step
        out = out[:, -1, :]
        out = self.fc(out)
        return out


@track(name="pytorch-neural-network")
def train_neural_network():
    """Train a simple neural network for classification."""
    print("🧠 Training Neural Network Classifier")

    # Generate synthetic data
    X, y = make_classification(
        n_samples=5000, n_features=20, n_informative=15, n_classes=3, random_state=42
    )

    # Split and scale data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    # Convert to PyTorch tensors
    X_train_tensor = torch.FloatTensor(X_train)
    y_train_tensor = torch.LongTensor(y_train)
    X_test_tensor = torch.FloatTensor(X_test)
    y_test_tensor = torch.LongTensor(y_test)

    # Create datasets and dataloaders
    train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
    test_dataset = TensorDataset(X_test_tensor, y_test_tensor)

    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)

    # Initialize model
    model = SimpleNN(input_size=20, hidden_size=64, num_classes=3).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # Training parameters
    num_epochs = 20

    # Log model architecture
    mlflow.log_text(str(model), "model_architecture.txt")
    mlflow.log_param("optimizer", "Adam")
    mlflow.log_param("learning_rate", 0.001)
    mlflow.log_param("batch_size", 64)
    mlflow.log_param("num_epochs", num_epochs)

    # Training loop
    print("  Training...")
    train_losses = []
    train_accuracies = []

    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)

            # Forward pass
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)

            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            # Statistics
            running_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += batch_y.size(0)
            correct += (predicted == batch_y).sum().item()

        # Calculate epoch metrics
        epoch_loss = running_loss / len(train_loader)
        epoch_acc = correct / total
        train_losses.append(epoch_loss)
        train_accuracies.append(epoch_acc)

        # Log metrics
        mlflow.log_metric("train_loss", epoch_loss, step=epoch)
        mlflow.log_metric("train_accuracy", epoch_acc, step=epoch)

        if (epoch + 1) % 5 == 0:
            print(
                f"    Epoch [{epoch+1}/{num_epochs}], Loss: {epoch_loss:.4f}, Accuracy: {epoch_acc:.3f}"
            )

    # Evaluation
    print("  Evaluating...")
    model.eval()
    test_correct = 0
    test_total = 0

    with torch.no_grad():
        for batch_x, batch_y in test_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            outputs = model(batch_x)
            _, predicted = torch.max(outputs.data, 1)
            test_total += batch_y.size(0)
            test_correct += (predicted == batch_y).sum().item()

    test_accuracy = test_correct / test_total
    mlflow.log_metric("test_accuracy", test_accuracy)

    print(f"  Test Accuracy: {test_accuracy:.3f}")

    return model


@track(name="pytorch-cnn-mnist")
def train_cnn():
    """Train a CNN on MNIST-like data."""
    print("\n📷 Training Convolutional Neural Network")

    # Generate synthetic image-like data (28x28)
    n_samples = 3000
    n_classes = 10

    # Create random "images"
    X = np.random.randn(n_samples, 1, 28, 28)
    y = np.random.randint(0, n_classes, n_samples)

    # Add some patterns to make it learnable
    for i in range(n_samples):
        class_idx = y[i]
        X[i, 0, class_idx : class_idx + 3, class_idx : class_idx + 3] = 1.0

    # Convert to tensors
    X_tensor = torch.FloatTensor(X)
    y_tensor = torch.LongTensor(y)

    # Create dataset and split
    dataset = TensorDataset(X_tensor, y_tensor)
    train_size = int(0.8 * len(dataset))
    test_size = len(dataset) - train_size
    train_dataset, test_dataset = random_split(dataset, [train_size, test_size])

    # Create dataloaders
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)

    # Initialize model
    model = CNN(num_classes=n_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.1)

    # Training
    num_epochs = 25

    print("  Training CNN...")
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0

        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)

            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()

        scheduler.step()

        # Log metrics
        epoch_loss = running_loss / len(train_loader)
        mlflow.log_metric("cnn_train_loss", epoch_loss, step=epoch)
        mlflow.log_metric("learning_rate", scheduler.get_last_lr()[0], step=epoch)

        if (epoch + 1) % 5 == 0:
            print(f"    Epoch [{epoch+1}/{num_epochs}], Loss: {epoch_loss:.4f}")

    # Evaluation
    model.eval()
    correct = 0
    total = 0

    with torch.no_grad():
        for batch_x, batch_y in test_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            outputs = model(batch_x)
            _, predicted = torch.max(outputs.data, 1)
            total += batch_y.size(0)
            correct += (predicted == batch_y).sum().item()

    test_accuracy = correct / total
    mlflow.log_metric("cnn_test_accuracy", test_accuracy)

    print(f"  CNN Test Accuracy: {test_accuracy:.3f}")

    return model


@track(name="pytorch-rnn-sequence")
def train_rnn_sequence():
    """Train an RNN for sequence classification."""
    print("\n📊 Training RNN for Sequence Classification")

    # Generate synthetic sequence data
    n_samples = 2000
    sequence_length = 50
    input_size = 10
    num_classes = 4

    # Create sequences with patterns
    X = np.random.randn(n_samples, sequence_length, input_size)
    y = np.random.randint(0, num_classes, n_samples)

    # Add class-specific patterns
    for i in range(n_samples):
        if y[i] == 0:
            X[i, :10, :] += 0.5  # Pattern at beginning
        elif y[i] == 1:
            X[i, -10:, :] += 0.5  # Pattern at end
        elif y[i] == 2:
            X[i, 20:30, :] += 0.5  # Pattern in middle
        else:
            X[i, ::5, :] += 0.5  # Pattern every 5 steps

    # Convert to tensors
    X_tensor = torch.FloatTensor(X)
    y_tensor = torch.LongTensor(y)

    # Create datasets
    dataset = TensorDataset(X_tensor, y_tensor)
    train_size = int(0.8 * len(dataset))
    test_size = len(dataset) - train_size
    train_dataset, test_dataset = random_split(dataset, [train_size, test_size])

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)

    # Initialize model
    model = SimpleRNN(
        input_size=input_size, hidden_size=64, num_layers=2, num_classes=num_classes
    ).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # Training
    num_epochs = 20

    print("  Training RNN...")
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)

            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += batch_y.size(0)
            correct += (predicted == batch_y).sum().item()

        epoch_loss = running_loss / len(train_loader)
        epoch_acc = correct / total

        mlflow.log_metric("rnn_train_loss", epoch_loss, step=epoch)
        mlflow.log_metric("rnn_train_accuracy", epoch_acc, step=epoch)

        if (epoch + 1) % 5 == 0:
            print(
                f"    Epoch [{epoch+1}/{num_epochs}], Loss: {epoch_loss:.4f}, Acc: {epoch_acc:.3f}"
            )

    # Test
    model.eval()
    test_correct = 0
    test_total = 0

    with torch.no_grad():
        for batch_x, batch_y in test_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            outputs = model(batch_x)
            _, predicted = torch.max(outputs.data, 1)
            test_total += batch_y.size(0)
            test_correct += (predicted == batch_y).sum().item()

    test_accuracy = test_correct / test_total
    mlflow.log_metric("rnn_test_accuracy", test_accuracy)

    print(f"  RNN Test Accuracy: {test_accuracy:.3f}")

    return model


@track(name="pytorch-custom-loss")
def train_with_custom_loss():
    """Demonstrate training with a custom loss function."""
    print("\n⚙️ Training with Custom Loss Function")

    class FocalLoss(nn.Module):
        """Focal Loss for addressing class imbalance."""

        def __init__(self, alpha=1, gamma=2):
            super(FocalLoss, self).__init__()
            self.alpha = alpha
            self.gamma = gamma

        def forward(self, inputs, targets):
            ce_loss = F.cross_entropy(inputs, targets, reduction="none")
            pt = torch.exp(-ce_loss)
            focal_loss = self.alpha * (1 - pt) ** self.gamma * ce_loss
            return focal_loss.mean()

    # Generate imbalanced dataset
    X, y = make_classification(
        n_samples=2000,
        n_features=15,
        n_informative=10,
        n_classes=3,
        weights=[0.7, 0.2, 0.1],  # Imbalanced classes
        random_state=42,
    )

    # Prepare data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    # Convert to tensors
    X_train_tensor = torch.FloatTensor(X_train)
    y_train_tensor = torch.LongTensor(y_train)
    X_test_tensor = torch.FloatTensor(X_test)
    y_test_tensor = torch.LongTensor(y_test)

    # Create datasets
    train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
    test_dataset = TensorDataset(X_test_tensor, y_test_tensor)

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)

    # Initialize model with custom loss
    model = SimpleNN(input_size=15, hidden_size=32, num_classes=3).to(device)
    criterion = FocalLoss(alpha=1, gamma=2)
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # Log custom loss parameters
    mlflow.log_param("loss_function", "FocalLoss")
    mlflow.log_param("focal_alpha", 1)
    mlflow.log_param("focal_gamma", 2)

    # Training
    num_epochs = 15

    print("  Training with Focal Loss...")
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0

        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)

            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()

        epoch_loss = running_loss / len(train_loader)
        mlflow.log_metric("focal_loss", epoch_loss, step=epoch)

        if (epoch + 1) % 5 == 0:
            print(f"    Epoch [{epoch+1}/{num_epochs}], Focal Loss: {epoch_loss:.4f}")

    # Evaluate with per-class accuracy
    model.eval()
    class_correct = [0] * 3
    class_total = [0] * 3

    with torch.no_grad():
        for batch_x, batch_y in test_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            outputs = model(batch_x)
            _, predicted = torch.max(outputs, 1)

            for i in range(batch_y.size(0)):
                label = batch_y[i].item()
                class_correct[label] += (predicted[i] == batch_y[i]).item()
                class_total[label] += 1

    # Log per-class accuracy
    for i in range(3):
        if class_total[i] > 0:
            accuracy = class_correct[i] / class_total[i]
            mlflow.log_metric(f"class_{i}_accuracy", accuracy)
            print(f"  Class {i} Accuracy: {accuracy:.3f} ({class_total[i]} samples)")

    overall_accuracy = sum(class_correct) / sum(class_total)
    mlflow.log_metric("overall_accuracy", overall_accuracy)
    print(f"  Overall Accuracy: {overall_accuracy:.3f}")

    return model


def main():
    """Run all PyTorch examples."""
    print("🚀 MLtrack PyTorch Examples\n")
    print("=" * 50)

    # Run all examples
    train_neural_network()
    train_cnn()
    train_rnn_sequence()
    train_with_custom_loss()

    print("\n" + "=" * 50)
    print("✅ All PyTorch examples completed!")
    print("\nTo view results:")
    print("  1. Run: uv run python -m mlflow ui")
    print("  2. Open: http://localhost:5000")
    print("  3. Explore the different experiments")


if __name__ == "__main__":
    main()
