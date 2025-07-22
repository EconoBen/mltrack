"""Tests for MLTrack lineage tracking functionality."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import json
from pathlib import Path
from datetime import datetime

from mltrack.lineage import (
    DataSource,
    DataSourceType,
    Transformation,
    TransformationType,
    LineageNode,
    LineageGraph,
    LineageTracker,
    track_input,
    track_output,
    track_transformation,
    get_current_lineage
)


class TestDataSource:
    """Test DataSource class."""
    
    def test_create_file_source(self):
        """Test creating a file data source."""
        source = DataSource(
            uri="data/train.csv",
            source_type=DataSourceType.FILE,
            metadata={"rows": 1000, "columns": 10}
        )
        
        assert source.uri == "data/train.csv"
        assert source.source_type == DataSourceType.FILE
        assert source.metadata["rows"] == 1000
        assert source.checksum is None
        
    def test_data_source_equality(self):
        """Test DataSource equality."""
        source1 = DataSource("s3://bucket/data.csv", DataSourceType.S3)
        source2 = DataSource("s3://bucket/data.csv", DataSourceType.S3)
        source3 = DataSource("s3://bucket/other.csv", DataSourceType.S3)
        
        assert source1 == source2
        assert source1 != source3
        
    def test_data_source_to_dict(self):
        """Test converting DataSource to dict."""
        source = DataSource(
            uri="http://api.example.com/data",
            source_type=DataSourceType.API,
            checksum="abc123",
            metadata={"format": "json"}
        )
        
        data = source.to_dict()
        assert data["uri"] == "http://api.example.com/data"
        assert data["source_type"] == "api"
        assert data["checksum"] == "abc123"
        assert data["metadata"]["format"] == "json"


class TestTransformation:
    """Test Transformation class."""
    
    def test_create_transformation(self):
        """Test creating a transformation."""
        transform = Transformation(
            name="normalize_features",
            transform_type=TransformationType.NORMALIZATION,
            description="Normalize features to 0-1 range",
            parameters={"method": "minmax"}
        )
        
        assert transform.name == "normalize_features"
        assert transform.transform_type == TransformationType.NORMALIZATION
        assert transform.description == "Normalize features to 0-1 range"
        assert transform.parameters["method"] == "minmax"
        
    def test_transformation_to_dict(self):
        """Test converting Transformation to dict."""
        transform = Transformation(
            name="split_data",
            transform_type=TransformationType.SPLITTING,
            parameters={"test_size": 0.2, "random_state": 42}
        )
        
        data = transform.to_dict()
        assert data["name"] == "split_data"
        assert data["transform_type"] == "splitting"
        assert data["parameters"]["test_size"] == 0.2


class TestLineageNode:
    """Test LineageNode class."""
    
    def test_create_node(self):
        """Test creating a lineage node."""
        node = LineageNode(node_id="node1", node_type="input")
        
        assert node.node_id == "node1"
        assert node.node_type == "input"
        assert isinstance(node.timestamp, datetime)
        assert node.metadata == {}
        
    def test_node_with_data_source(self):
        """Test node with data source."""
        source = DataSource("file.csv", DataSourceType.FILE)
        node = LineageNode(
            node_id="input1",
            node_type="input",
            data_source=source
        )
        
        assert node.data_source == source
        assert node.transformation is None
        
    def test_node_to_dict(self):
        """Test converting node to dict."""
        transform = Transformation(
            "feature_eng",
            TransformationType.FEATURE_ENGINEERING
        )
        node = LineageNode(
            node_id="transform1",
            node_type="transformation",
            transformation=transform,
            metadata={"duration": 10.5}
        )
        
        data = node.to_dict()
        assert data["node_id"] == "transform1"
        assert data["node_type"] == "transformation"
        assert data["transformation"]["name"] == "feature_eng"
        assert data["metadata"]["duration"] == 10.5


class TestLineageGraph:
    """Test LineageGraph class."""
    
    def test_create_empty_graph(self):
        """Test creating empty lineage graph."""
        graph = LineageGraph()
        
        assert len(graph.nodes) == 0
        assert len(graph.edges) == 0
        
    def test_add_node(self):
        """Test adding nodes to graph."""
        graph = LineageGraph()
        
        node1 = LineageNode("input1", "input")
        node2 = LineageNode("transform1", "transformation")
        
        graph.add_node(node1)
        graph.add_node(node2)
        
        assert len(graph.nodes) == 2
        assert "input1" in graph.nodes
        assert "transform1" in graph.nodes
        
    def test_add_edge(self):
        """Test adding edges to graph."""
        graph = LineageGraph()
        
        node1 = LineageNode("input1", "input")
        node2 = LineageNode("transform1", "transformation")
        
        graph.add_node(node1)
        graph.add_node(node2)
        graph.add_edge("input1", "transform1")
        
        assert len(graph.edges) == 1
        assert ("input1", "transform1") in graph.edges
        
    def test_add_edge_missing_node(self):
        """Test adding edge with missing node."""
        graph = LineageGraph()
        graph.add_node(LineageNode("node1", "input"))
        
        with pytest.raises(ValueError, match="Node 'node2' not found"):
            graph.add_edge("node1", "node2")
            
    def test_get_inputs_outputs(self):
        """Test getting input and output nodes."""
        graph = LineageGraph()
        
        input1 = LineageNode("input1", "input")
        input2 = LineageNode("input2", "input")
        output1 = LineageNode("output1", "output")
        transform = LineageNode("transform1", "transformation")
        
        graph.add_node(input1)
        graph.add_node(input2)
        graph.add_node(output1)
        graph.add_node(transform)
        
        inputs = graph.get_inputs()
        outputs = graph.get_outputs()
        
        assert len(inputs) == 2
        assert len(outputs) == 1
        assert all(n.node_type == "input" for n in inputs)
        assert outputs[0].node_type == "output"


class TestLineageTracker:
    """Test LineageTracker class."""
    
    @patch('mltrack.lineage.mlflow')
    def test_init_tracker(self, mock_mlflow):
        """Test initializing lineage tracker."""
        mock_run = Mock()
        mock_run.info.run_id = "test-run-123"
        
        tracker = LineageTracker(mock_run)
        
        assert tracker.run_id == "test-run-123"
        assert isinstance(tracker.graph, LineageGraph)
        
    @patch('mltrack.lineage.mlflow')
    def test_track_input_file(self, mock_mlflow):
        """Test tracking file input."""
        mock_run = Mock()
        mock_run.info.run_id = "test-run-123"
        tracker = LineageTracker(mock_run)
        
        # Track input
        tracker.track_input("data/train.csv", DataSourceType.FILE)
        
        # Verify
        inputs = tracker.graph.get_inputs()
        assert len(inputs) == 1
        assert inputs[0].data_source.uri == "data/train.csv"
        assert inputs[0].data_source.source_type == DataSourceType.FILE
        
    @patch('mltrack.lineage.mlflow')
    def test_track_transformation(self, mock_mlflow):
        """Test tracking transformation."""
        mock_run = Mock()
        mock_run.info.run_id = "test-run-123"
        tracker = LineageTracker(mock_run)
        
        # Track transformation
        tracker.track_transformation(
            name="scale_features",
            transform_type=TransformationType.NORMALIZATION,
            description="StandardScaler",
            parameters={"with_mean": True, "with_std": True}
        )
        
        # Verify
        assert len(tracker.graph.nodes) == 1
        node = list(tracker.graph.nodes.values())[0]
        assert node.transformation.name == "scale_features"
        assert node.transformation.parameters["with_mean"] is True
        
    @patch('mltrack.lineage.mlflow')
    def test_save_lineage(self, mock_mlflow):
        """Test saving lineage to MLflow."""
        mock_run = Mock()
        mock_run.info.run_id = "test-run-123"
        tracker = LineageTracker(mock_run)
        
        # Add some lineage
        tracker.track_input("input.csv", DataSourceType.FILE)
        tracker.track_output("output.csv", DataSourceType.FILE)
        
        # Save
        tracker.save_lineage()
        
        # Verify MLflow calls
        assert mock_mlflow.log_dict.called
        assert mock_mlflow.set_tag.called
        
        # Check logged data
        call_args = mock_mlflow.log_dict.call_args
        assert call_args[0][1] == "lineage/lineage.json"
        

class TestModuleFunctions:
    """Test module-level convenience functions."""
    
    @patch('mltrack.lineage.mlflow')
    @patch('mltrack.lineage._get_or_create_tracker')
    def test_track_input_function(self, mock_get_tracker, mock_mlflow):
        """Test track_input function."""
        mock_tracker = Mock()
        mock_get_tracker.return_value = mock_tracker
        
        # Call function
        track_input("s3://bucket/data.parquet", DataSourceType.S3)
        
        # Verify
        mock_tracker.track_input.assert_called_once_with(
            "s3://bucket/data.parquet",
            DataSourceType.S3,
            None,
            {}
        )
        
    @patch('mltrack.lineage.mlflow')
    @patch('mltrack.lineage._get_or_create_tracker')
    def test_track_transformation_function(self, mock_get_tracker, mock_mlflow):
        """Test track_transformation function."""
        mock_tracker = Mock()
        mock_get_tracker.return_value = mock_tracker
        
        # Call function
        track_transformation(
            name="encode_categorical",
            transform_type=TransformationType.ENCODING,
            description="One-hot encoding"
        )
        
        # Verify
        mock_tracker.track_transformation.assert_called_once()
        
    @patch('mltrack.lineage._current_tracker')
    def test_get_current_lineage(self, mock_current_tracker):
        """Test getting current lineage."""
        mock_tracker = Mock()
        mock_tracker.get_lineage.return_value = {"test": "lineage"}
        mock_current_tracker.__getitem__.return_value = mock_tracker
        
        # Get lineage
        lineage = get_current_lineage()
        
        # Verify
        assert lineage == {"test": "lineage"}