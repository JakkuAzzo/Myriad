import re
from docx import Document

def verify(docx_path):
    doc = Document(docx_path)
    paras = doc.paragraphs
    
    print("--- 1) Front Matter through Chapter 1 and Glossary ---")
    # Scan first 150 paragraphs for these markers
    found_chapters = False
    for i, p in enumerate(paras[:200]):
        text = p.text.strip()
        style = p.style.name
        if style.startswith('Heading') or any(word in text.lower() for word in ['contents', 'abstract', 'declaration', 'glossary', 'introduction']):
             if text:
                print(f"Index: {i} | Style: {style} | Text: {text}")

    print("\n--- 2) Specific Heading Indices ---")
    targets = [
        "2.6.1 Persona",
        "3.2.4 Data",
        "4.1.1 Usability",
        "4.2.1 System",
        "4.3.1 Evaluation",
        "Appendix G",
        "Appendix H",
        "Appendix I",
        "Appendix J"
    ]
    for i, p in enumerate(paras):
        text = p.text.strip()
        for t in targets:
            if text.startswith(t):
                print(f"Match '{t}': Index: {i} | Text: {text}")

    print("\n--- 3) Placeholder Strings Check ('2.x', '3.x', '4.x') ---")
    placeholders = ['2.x', '3.x', '4.x']
    for i, p in enumerate(paras):
        for ph in placeholders:
            if ph in p.text:
                print(f"Found {ph} at Index {i}: {p.text}")

    print("\n--- 4) Specific Phrase Check ('cyber security dissertation') ---")
    phrase = 'cyber security dissertation'
    found_phrase = False
    for i, p in enumerate(paras):
        if phrase in p.text.lower():
            print(f"Found phrase at Index {i}: {p.text}")
            found_phrase = True
    if not found_phrase:
        print("Phrase not found.")

    print("\n--- 5) Date Format Check (dd/mm/yyyy) near Declaration ---")
    date_pattern = re.compile(r'\d{2}/\d{2}/\d{4}')
    # Look for declaration heading then check nearby
    decl_idx = -1
    for i, p in enumerate(paras[:100]):
        if 'declaration' in p.text.lower():
            decl_idx = i
            break
    
    if decl_idx != -1:
        for i in range(max(0, decl_idx-5), min(len(paras), decl_idx+20)):
            matches = date_pattern.findall(paras[i].text)
            if matches:
                 print(f"Index: {i} | Text: {paras[i].text}")

if __name__ == "__main__":
    verify("/Users/nathanbrown-bennett/Said Osman/Myriad_Dissertation_Said_Osman_Completed_restructured.docx")
