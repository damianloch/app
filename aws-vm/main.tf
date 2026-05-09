terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_security_group" "vm_sg" {
  name        = "aurora-vm-sg"
  description = "Security group for Aurora small VM"
  vpc_id      = "vpc-072179b0a604e314e"

  # Allow SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH access"
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name       = "aurora-vm-sg"
    ManagedBy  = "terraform"
    CreatedBy  = "aurora"
  }
}

resource "aws_instance" "small_vm" {
  ami                         = "ami-0a59ec92177ec3fad"
  instance_type               = "t3.micro"
  subnet_id                   = "subnet-0f667a1efa7cf1dcd"
  vpc_security_group_ids      = [aws_security_group.vm_sg.id]
  associate_public_ip_address = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name       = "aurora-small-vm"
    ManagedBy  = "terraform"
    CreatedBy  = "aurora"
  }
}

output "instance_id" {
  value       = aws_instance.small_vm.id
  description = "The ID of the EC2 instance"
}

output "public_ip" {
  value       = aws_instance.small_vm.public_ip
  description = "The public IP address of the instance"
}

output "private_ip" {
  value       = aws_instance.small_vm.private_ip
  description = "The private IP address of the instance"
}
