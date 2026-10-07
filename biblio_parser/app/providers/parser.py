import requests
from bs4 import BeautifulSoup
import re
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Известные корневые разделы с главной страницы библиотеки
ROOT_SECTION_PATHS = {
    "/handle/1212121212/17870": "ОКРБ 011-2009",
    "/handle/1212121212/39836": "ОКРБ 011-2022",
    "/handle/1212121212/3120": "РФ",
    "/handle/1212121212/18910": "РФ 3++",
    "/handle/1212121212/10": "Факультеты",
}


class SiteCrawler:
    def __init__(self, base_url: str, faculties_link: str = None):
        self.base_url = base_url.rstrip("/") + "/"
        self.faculties_link = faculties_link

    def fetch_page(self, url: str):
        try:
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            logger.error(f"Ошибка при запросе {url}: {e}")
            return None

    def _normalize_path(self, href: str) -> str:
        if href.startswith("http"):
            return urlparse(href).path
        return href.split("?")[0]

    def parse_root_sections(self, html: str):
        """Собирает с главной 5 корневых разделов УМО / факультетов."""
        soup = BeautifulSoup(html, "html.parser")
        sections = []
        seen = set()

        for a_tag in soup.find_all("a", href=True):
            path = self._normalize_path(a_tag["href"])
            short_name = ROOT_SECTION_PATHS.get(path)
            if not short_name or path in seen:
                continue
            seen.add(path)
            sections.append({
                "name": short_name,
                "full_name": a_tag.get_text(" ", strip=True) or short_name,
                "url": self.base_url.rstrip("/") + path,
                "relative_path": path,
            })

        # Fallback: если главная не отдала ссылки — берём FACULTIES_LINK
        if not sections and self.faculties_link:
            path = self._normalize_path(self.faculties_link)
            sections.append({
                "name": ROOT_SECTION_PATHS.get(path, "Факультеты"),
                "full_name": ROOT_SECTION_PATHS.get(path, "Факультеты"),
                "url": self.base_url.rstrip("/") + path,
                "relative_path": path,
            })

        return sections

    def get_faculties_url(self, main_page):
        soup = BeautifulSoup(main_page, "html.parser")
        faculties_link = soup.find("a", href=self.faculties_link)
        if not faculties_link:
            logger.error(f"Ссылка {self.faculties_link} на факультеты не найдена")
            return
        faculties_url = self.base_url.rstrip("/") + faculties_link["href"]
        return faculties_url

    def parse_communities(self, html: str):
        soup = BeautifulSoup(html, "html.parser")
        communities = []

        community_list_head = soup.find("h2", class_="ds-list-head")
        if not community_list_head:
            return communities

        community_list_ul = community_list_head.find_next_sibling("ul")
        if not community_list_ul:
            return communities

        for li in community_list_ul.find_all("li"):
            a_tag = li.find("a", href=True)
            if not a_tag:
                continue

            name_span = a_tag.find("span", class_="Z3988")
            name = name_span.get_text(strip=True) if name_span else a_tag.get_text(strip=True)
            relative_url = a_tag["href"]
            count_text = li.get_text(strip=True)
            match = re.search(r"\[(\d+)\]", count_text)
            count = int(match.group(1)) if match else 0

            if name and relative_url:
                communities.append({
                    "name": name,
                    "url": self.base_url.rstrip("/") + relative_url,
                    "relative_path": relative_url,
                    "count": count,
                })
        return communities

    def parse_materials_list(self, html: str):
        soup = BeautifulSoup(html, "html.parser")
        materials = []

        artifact_list = soup.find("ul", class_="ds-artifact-list")
        if not artifact_list:
            return materials

        for li in artifact_list.find_all("li", class_="ds-artifact-item"):
            description = li.find("div", class_="artifact-description")
            if description:
                title_a = description.find("a")
                if title_a:
                    materials.append({
                        "title": title_a.text.strip(),
                        "url": self.base_url.rstrip("/") + title_a["href"] + "?show=full",
                        "relative_path": title_a["href"],
                    })
        return materials

    def get_all_materials(self, dept_url, count):
        materials = []
        offset = 0
        page_size = 20
        while offset < count:
            page_url = f"{dept_url}/recent-submissions?offset={offset}"
            html = self.fetch_page(page_url)
            if not html:
                break

            page_materials = self.parse_materials_list(html)
            materials.extend(page_materials)

            if len(page_materials) < page_size:
                break

            offset += page_size

        return materials

    def parse_material_metadata(self, html: str):
        soup = BeautifulSoup(html, "html.parser")
        metadata = {
            "title": None, "creator": [], "abstract": None,
            "issued": None, "pages": 0, "identifier": None,
            "subject": [], "type": [], "spec": [], "udc": [],
            "file_link": None,
        }

        table = soup.find("table", class_="ds-includeSet-table detailtable")
        if not table:
            return metadata

        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) < 2:
                continue

            label = cells[0].get_text(strip=True).lower()
            raw_text = cells[1].get_text(strip=True)
            values = [v.strip() for v in raw_text.split("|") if v.strip()]

            if "author" in label:
                metadata["creator"].extend(values)
            elif "available" in label:
                metadata["available"] = values[0]
            elif "issued" in label:
                metadata["issued"] = values[0]
            elif "abstract" in label:
                metadata["abstract"] = values[0]
            elif "language" in label:
                metadata["language"] = values[0]
            elif "publisher" in label:
                metadata["publisher"] = values[0]
            elif "uri" in label:
                metadata["identifier"] = values[0]
            elif "dc.title" == label:
                metadata["title"] = values[0]
            elif "citation" in label:
                metadata["bibliographic_citation"] = values[0]
                match = re.search(r"-\s*(\d+)\s*с\.", values[0])
                if match:
                    pages = int(match.group(1))
                    metadata["pages"] = pages
            elif "dc.subject" == label:
                metadata["subject"].extend(values)
            elif "alternative" in label:
                metadata["title_alternative"] = values[0]
            elif "type" in label:
                metadata["type"].extend(values)
            elif "spec" in label:
                metadata["spec"].extend(values)
            elif "udc" in label:
                metadata["udc"].extend(values)

        file_div = soup.find("div", class_="file-link")
        if file_div:
            file_a = file_div.find("a", href=True)
            if file_a:
                href = file_a["href"]
                if href.startswith("http"):
                    metadata["file_link"] = href
                else:
                    metadata["file_link"] = self.base_url.rstrip("/") + href

        return metadata
