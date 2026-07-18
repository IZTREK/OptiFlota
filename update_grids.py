import os
import re

base_dir = r"C:\Users\Rafota\Desktop\Proyectos\Optiflota\OptiFlota\Front-end"

def update_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    # Reemplazar los grid en linea por clase responsive-grid
    # style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;" -> class="responsive-grid" style="margin-top: 24px;"
    # En index.html: <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
    
    # Simplemente reemplazaremos "display: grid; grid-template-columns: 1fr 1fr; gap: Xpx;"
    # o similares por la clase y un style depurado si es necesario, pero como hay varios formatos:
    content = re.sub(
        r'style="display:\s*grid;\s*grid-template-columns:\s*1fr 1fr;\s*gap:\s*\d+px;?(.*?)"',
        r'class="responsive-grid" style="\1"',
        content
    )
    content = re.sub(
        r'style="display:\s*grid;\s*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\([^)]+\)\);\s*gap:\s*\d+px;?(.*?)"',
        r'class="responsive-grid" style="\1"',
        content
    )

    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {file_path}")

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.html') or file.endswith('.js'):
            update_file(os.path.join(root, file))

print("Done inline grids.")
