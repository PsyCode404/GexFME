from flask import Blueprint
import sys
import os

# Add the parent directory to sys.path to allow importing folder_service
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Force reload the module to ensure we get the latest version
import importlib
import folder_service
importlib.reload(folder_service)

# Import the functions we need
from folder_service import (
    create_folder,
    check_folder,
    get_folder_files,
    transfer_files,
    extract_data_from_file,
    get_visa_content,
    download_visa_file,
    generate_visa_file,
    generate_excel_file,
    download_excel_file
)

# Create a blueprint with a URL prefix to match what the frontend expects
folder_service_blueprint = Blueprint('folder_service', __name__, url_prefix='')

@folder_service_blueprint.route('/create-folder', methods=['POST'])
def create_folder_route():
    return create_folder()

@folder_service_blueprint.route('/check-folder', methods=['POST'])
def check_folder_route():
    return check_folder()

@folder_service_blueprint.route('/get-folder-files', methods=['POST'])
def get_folder_files_route():
    return get_folder_files()

@folder_service_blueprint.route('/transfer-files', methods=['POST'])
def transfer_files_route():
    return transfer_files()

@folder_service_blueprint.route('/extract-data-from-file', methods=['POST'])
def extract_data_route():
    return extract_data_from_file()

@folder_service_blueprint.route('/get-visa-content', methods=['POST'])
def get_visa_content_route():
    return get_visa_content()

@folder_service_blueprint.route('/download-visa-file', methods=['GET'])
def download_visa_route():
    return download_visa_file()

@folder_service_blueprint.route('/generate-visa-file', methods=['POST'])
def generate_visa_route():
    return generate_visa_file()

@folder_service_blueprint.route('/generate-excel-file', methods=['POST'])
def generate_excel_route():
    return generate_excel_file()

@folder_service_blueprint.route('/download-excel-file', methods=['GET'])
def download_excel_route():
    return download_excel_file()
