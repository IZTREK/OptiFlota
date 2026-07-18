import os
import re

base_dir = r"C:\Users\Rafota\Desktop\Proyectos\Optiflota\OptiFlota\Front-end"

def update_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'class="topbar"' not in content or 'class="sidebar"' not in content:
        return

    # Si ya tiene el botón, lo saltamos
    if 'id="mobile-menu-toggle"' in content:
        return

    # Buscar topbar y reemplazar añadiendo el botón justo después
    # La topbar puede ser <header class="topbar"> o <div class="topbar">
    content = re.sub(
        r'(<(?:header|div) class="topbar">)',
        r'\1\n                <button class="mobile-menu-toggle" id="mobile-menu-toggle">☰</button>',
        content
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Added button to: {file_path}")

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.html'):
            update_file(os.path.join(root, file))

print("Done button addition.")
