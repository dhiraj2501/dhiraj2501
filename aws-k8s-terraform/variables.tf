# variables.tf

variable "aws_region" {
  description = "The AWS region to deploy resources in."
  type        = string
  default     = "us-east-1" # You can change this to your preferred region
}

variable "ami_id" {
  description = "The AMI ID for Ubuntu 22.04 LTS (HVM, SSD) - us-east-1 example."
  type        = string
  default     = "ami-053b0d53c279acc90"
}

variable "instance_type_master" {
  description = "The instance type for the Kubernetes master node."
  type        = string
  default     = "c3.xlarge" # Updated to c3.xlarge as requested
}

variable "instance_type_worker" {
  description = "The instance type for the Kubernetes worker nodes."
  type        = string
  default     = "c3.xlarge" # Updated to c3.xlarge as requested
}

variable "ebs_volume_size" {
  description = "The size of the root EBS volume in GB."
  type        = number
  default     = 20 # Increased the default size to 20 GB
}

variable "key_pair_name" {
  description = "The name of the existing SSH key pair in your AWS account."
  type        = string
  default     = "dhirajsajagure" # <<< CHANGE THIS to your actual key pair name
}

variable "public_key_path" {
  description = "The path to your public SSH key file (e.g., ~/.ssh/id_rsa.pub)."
  type        = string
  default     = "/Users/dsajagure/Documents/ec2access/dhirajsajagure.pub" # <<< CHANGE THIS to your actual public key path
}
