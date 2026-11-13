#!/usr/bin/env python3
"""Apply the fullscreen layout changes to the Vite APOY repo by porting
the Next.js component files with import-path adjustments for the Vite layout:
- App.tsx lives at src/App.tsx -> components are at ./components/X
- types at src/types.ts -> components import from ../types
- utils at src/lib/utils.ts -> components import from ../lib/utils
- UploadZone uses React.DragEvent -> needs `import React` (Vite tsconfig)
- App.tsx uses ./lib/utils and ./types (same dir level)
"""
import re
from pathlib import Path

NX = Path('/home/z/my-project/src/components/apoy')
VITE = Path('/tmp/APOY-push/src/components')
VITE_SRC = Path('/tmp/APOY-push/src')

def fix_app_imports(content):
    """App.tsx is at src/App.tsx in Vite."""
    # Next.js ApoyApp.tsx imports './TopBar' but Vite App.tsx needs './components/TopBar'
    for comp in ['TopBar', 'Sidebar', 'UploadZone', 'PhotoGrid', 'AnalysisView', 'ExportView']:
        content = content.replace(f"from './{comp}'", f"from './components/{comp}'")
    # Next.js uses @/lib/utils -> Vite App uses ./lib/utils
    content = content.replace("from '@/lib/utils'", "from './lib/utils'")
    # Rename ApoyApp -> App
    content = content.replace('export default function ApoyApp()', 'export default function App()')
    # Vite App.tsx originally imported GoogleGenAI - but we don't use it in the layout
    # version (the Next.js port removed it). That's fine, the AI object was unused.
    return content

def fix_component_imports(content):
    """Components live at src/components/X.tsx in Vite."""
    # Next.js components import './types' -> Vite needs '../types'
    content = content.replace("from './types'", "from '../types'")
    # Next.js uses @/lib/utils -> Vite components use ../lib/utils
    content = content.replace("from '@/lib/utils'", "from '../lib/utils'")
    # Next.js components import './PhotoCard' (same dir) - that's fine in Vite too
    return content

def fix_uploadzone_react(content):
    """Vite tsconfig needs explicit React import for React.DragEvent namespace."""
    if "import { useCallback } from 'react'" in content and 'React.DragEvent' in content:
        content = content.replace(
            "import { useCallback } from 'react';",
            "import React, { useCallback } from 'react';"
        )
    return content

def port_file(nx_name, vite_path, is_app=False, is_upload=False):
    src = (NX / nx_name).read_text()
    if is_app:
        out = fix_app_imports(src)
    else:
        out = fix_component_imports(src)
    if is_upload:
        out = fix_uploadzone_react(out)
    vite_path.write_text(out)
    print(f"OK  {nx_name} -> {vite_path}")

# App.tsx (root shell redesign) at src/App.tsx
port_file('ApoyApp.tsx', VITE_SRC / 'App.tsx', is_app=True)

# Components at src/components/
port_file('PhotoGrid.tsx', VITE / 'PhotoGrid.tsx')
port_file('UploadZone.tsx', VITE / 'UploadZone.tsx', is_upload=True)
port_file('AnalysisView.tsx', VITE / 'AnalysisView.tsx')
port_file('ExportView.tsx', VITE / 'ExportView.tsx')

print("\nDone porting all files.")
