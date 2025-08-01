# main.tf

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region
}

# --- VPC and Networking ---
resource "aws_vpc" "k8s_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "k8s-vpc"
  }
}

resource "aws_subnet" "k8s_subnet" {
  vpc_id                  = aws_vpc.k8s_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a" # Using a specific AZ for simplicity
  map_public_ip_on_launch = true                # Assign public IP to instances

  tags = {
    Name = "k8s-subnet"
  }
}

resource "aws_internet_gateway" "k8s_igw" {
  vpc_id = aws_vpc.k8s_vpc.id

  tags = {
    Name = "k8s-igw"
  }
}

resource "aws_route_table" "k8s_route_table" {
  vpc_id = aws_vpc.k8s_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.k8s_igw.id
  }

  tags = {
    Name = "k8s-route-table"
  }
}

resource "aws_route_table_association" "k8s_route_table_association" {
  subnet_id      = aws_subnet.k8s_subnet.id
  route_table_id = aws_route_table.k8s_route_table.id
}

# --- Security Group for Kubernetes Cluster ---
resource "aws_security_group" "k8s_sg" {
  name        = "k8s-security-group"
  description = "Allow SSH, Kubernetes ports, and all internal traffic"
  vpc_id      = aws_vpc.k8s_vpc.id

  # Inbound Rules:
  # SSH access from anywhere
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Be cautious with 0.0.0.0/0 in production
    description = "Allow SSH"
  }

  # Kubernetes API Server (Master)
  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Kubernetes API Server"
  }

  # etcd Server Client (Master)
  ingress {
    from_port   = 2379
    to_port     = 2380
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "etcd Server Client"
  }

  # Kubelet API (Master & Workers)
  ingress {
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Kubelet API"
  }

  # Kube-scheduler (Master)
  ingress {
    from_port   = 10251
    to_port     = 10251
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Kube-scheduler"
  }

  # Kube-controller-manager (Master)
  ingress {
    from_port   = 10252
    to_port     = 10252
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Kube-controller-manager"
  }

  # NodePort Services (Workers)
  ingress {
    from_port   = 30000
    to_port     = 32767
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "NodePort Services"
  }

  # Flannel VXLAN for inter-pod communication
  ingress {
    from_port   = 8472
    to_port     = 8472
    protocol    = "udp"
    self        = true
    description = "Flannel VXLAN overlay network"
  }

  # Allow all traffic within the security group (for internal cluster communication)
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1" # All protocols
    self        = true # From instances associated with this SG
    description = "Allow all internal traffic within SG"
  }

  # Outbound Rules: Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "k8s-sg"
  }
}

# --- EC2 Key Pair ---
# Instead of creating a new key pair, we will now look up an existing one.
# Ensure the 'key_pair_name' variable in variables.tf matches an existing key pair in your AWS account.
data "aws_key_pair" "existing_k8s_key_pair" {
  key_name = var.key_pair_name
}


# --- EC2 Instances ---
# Master Node
resource "aws_instance" "k8s_master" {
  ami                    = var.ami_id
  instance_type          = var.instance_type_master
  key_name               = data.aws_key_pair.existing_k8s_key_pair.key_name
  subnet_id              = aws_subnet.k8s_subnet.id
  vpc_security_group_ids = [aws_security_group.k8s_sg.id]
  associate_public_ip_address = true
  
  # The user_data is now passed from a static template file to break the circular dependency.
  user_data = file("${path.module}/user_data_master.tftpl")

  # Use the new variable for the root EBS volume
  root_block_device {
    volume_size = var.ebs_volume_size
  }

  tags = {
    Name = "k8s-master"
    Role = "master"
  }
}

# Worker Nodes
resource "aws_instance" "k8s_workers" {
  count                  = 2 # Create 2 worker nodes
  ami                    = var.ami_id
  instance_type          = var.instance_type_worker
  key_name               = data.aws_key_pair.existing_k8s_key_pair.key_name
  subnet_id              = aws_subnet.k8s_subnet.id
  vpc_security_group_ids = [aws_security_group.k8s_sg.id]
  associate_public_ip_address = true
  
  # The user_data is now passed from a static template file to break the circular dependency.
  user_data = file("${path.module}/user_data_worker.tftpl")

  # Use the new variable for the root EBS volume
  root_block_device {
    volume_size = var.ebs_volume_size
  }

  tags = {
    Name = "k8s-worker-${count.index + 1}"
    Role = "worker"
  }
}
