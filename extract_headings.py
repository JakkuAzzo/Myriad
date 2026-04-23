import sys
from docx import Document

def extract_headings(docx_path):
    doc = Document(docx_path)
    all_headings = []
    
    # Track chapter numbers for Level 1, 2, 3
    # Although the request asks for levels 2 and 3 with prefixes, 
    # we usually need level 1 to know the major chapter number.
    counters = [0, 0, 0] # [lvl1, lvl2, lvl3]

    for i, para in enumerate(doc.paragraphs):
        style_name = para.style.name
        if style_name.startswith('Heading'):
            try:
                level = int(style_name.split()[-1])
            except ValueError:
                continue
            
            text = para.text.strip()
            all_headings.append((i, style_name, text))
            
            if level == 1:
                counters[0] += 1
                counters[1] = 0
                counters[2] = 0
            elif level == 2:
                counters[1] += 1
                counters[2] = 0
                prefix = f"{counters[0]}.{counters[1]}"
                if level in [2, 3]:
                    print(f"Prefix: {prefix} | {text}")
            elif level == 3:
                counters[2] += 1
                prefix = f"{counters[0]}.{counters[1]}.{counters[2]}"
                if level in [2, 3]:
                    print(f"Prefix: {prefix} | {text}")

    print("\n--- All Headings (Index, Style, Text) ---")
    for idx, style, text in all_headings:
        print(f"{idx} | {style} | {text}")

if __name__ == "__main__":
    extract_headings("Myriad_Dissertation_Said_Osman_Completed.docx")
