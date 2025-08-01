# manage_instances.py

import subprocess
import os
import argparse
import sys

def run_terraform_command(command, terraform_dir="."):
    """
    Runs a Terraform command in the specified directory.
    """
    print(f"\n--- Running Terraform: terraform {command} ---")
    try:
        # Use Popen to stream output in real-time
        process = subprocess.Popen(
            f"terraform {command}",
            shell=True,
            cwd=terraform_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True, # Decode stdout/stderr as text
            bufsize=1 # Line-buffered output
        )

        # Print output line by line
        # Ensure process.stdout is not None before iterating
        if process.stdout:
            for line in process.stdout:
                sys.stdout.write(line)
                sys.stdout.flush()

        process.wait() # Wait for the process to complete

        if process.returncode != 0:
            print(f"Error: Terraform command 'terraform {command}' failed with exit code {process.returncode}")
            sys.exit(1)
        print(f"--- Terraform: terraform {command} completed successfully ---")
        return True
    except FileNotFoundError:
        print("Error: 'terraform' command not found. Please ensure Terraform is installed and in your PATH.")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description="Manage AWS EC2 instances using Terraform."
    )
    parser.add_argument(
        "action",
        choices=["create", "destroy"],
        help="Action to perform: 'create' to provision instances, 'destroy' to terminate them."
    )
    parser.add_argument(
        "--terraform-dir",
        default=".",
        help="Directory where your Terraform files (.tf) are located. Default is current directory."
    )

    args = parser.parse_args()

    terraform_dir = args.terraform_dir
    if not os.path.isdir(terraform_dir):
        print(f"Error: Terraform directory '{terraform_dir}' not found.")
        sys.exit(1)

    # Initialize Terraform
    if not run_terraform_command("init", terraform_dir):
        return

    if args.action == "create":
        # Apply Terraform to create instances
        print("\n--- Applying Terraform to create instances. This may take a few minutes... ---")
        if run_terraform_command("apply -auto-approve", terraform_dir):
            print("\nEC2 instances provisioned successfully!")
            print("Check the Terraform output for master and worker IPs.")
    elif args.action == "destroy":
        # Destroy Terraform resources
        print("\n--- Destroying Terraform resources. This will terminate your EC2 instances. ---")
        confirm = input("Are you sure you want to destroy all resources? Type 'yes' to confirm: ")
        if confirm.lower() == "yes":
            if run_terraform_command("destroy -auto-approve", terraform_dir):
                print("\nEC2 instances terminated successfully!")
        else:
            print("Destruction cancelled.")

if __name__ == "__main__":
    main()
