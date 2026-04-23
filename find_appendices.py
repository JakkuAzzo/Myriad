from docx import Document

def find_appendices(docx_path):
    doc = Document(docx_path)
    for i, para in enumerate(doc.paragraphs):
        if para.style.name.startswith('Heading') and para.text.strip().startswith('Appendix'):
            print(f"Index: {i} | Style: {para.style.name} | Text: {para.text.strip()}")

if __name__ == "__main__":
    find_appendices("Myriad_Dissertation_Said_Osman_Completed.docx")
