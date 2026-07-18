import os
import re

base_dir = r"C:\Users\Rafota\Desktop\Proyectos\Optiflota\OptiFlota\Front-end"

def update_html_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Si no tiene topbar o sidebar, probablemente no sea un dashboard
    if 'class="topbar"' not in content or 'class="sidebar"' not in content:
        return

    modified = False

    # 1. Añadir el botón en la topbar
    if 'id="mobile-menu-toggle"' not in content:
        # Encontrar la etiqueta topbar y el H2
        # Ejemplo: <div class="topbar">\n    <h2>Panel de Cliente</h2>
        # Lo cambiaremos por <div class="topbar">\n    <button class="mobile-menu-toggle" id="mobile-menu-toggle">☰</button>\n    <h2>...
        content = re.sub(
            r'(<div class="topbar">\s*)(<h2>)',
            r'\1<button class="mobile-menu-toggle" id="mobile-menu-toggle">☰</button>\n            \2',
            content
        )
        modified = True

    # 2. Añadir el script antes de </body>
    if 'responsive.js' not in content:
        # Calcular la ruta relativa al script
        # file_path example: ...\Front-end\Cliente\Vehiculos\vehiculos.html
        # script is in ...\Front-end\js\responsive.js
        rel_path_to_frontend = os.path.relpath(base_dir, os.path.dirname(file_path))
        script_path = os.path.join(rel_path_to_frontend, 'js', 'responsive.js').replace('\\', '/')
        
        script_tag = f'<script src="{script_path}"></script>\n</body>'
        content = content.replace('</body>', script_tag)
        modified = True

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {file_path}")

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.html'):
            update_html_file(os.path.join(root, file))

print("Done.")
