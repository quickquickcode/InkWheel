#!/usr/bin/env python3
"""根据源站名称关键词，给 RSS 源自动分类。

用法：
    cd backend && python3 scripts/classify_sources.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.rss import rss_service


# 话题 id 与匹配规则（源名称包含任意关键词即归入该话题）
TOPIC_RULES: list[tuple[str, list[str]]] = [
    (
        "ai-llm",
        [
            "AI",
            "人工智能",
            "大模型",
            "LLM",
            "Agent",
            "智能体",
            "机器学习",
            "深度学习",
            "神经网络",
            "OpenAI",
            "Claude",
            "GPT",
            "Kimi",
            "DeepSeek",
            "MiniMax",
            "智谱",
            "通义",
            "文心",
            "混元",
            "阶跃",
            "Seed",
            "SOTA",
            "ModelScope",
            "魔搭",
            "LangChain",
            "RAG",
            "多模态",
            "AIGC",
            "生成式",
            "AGI",
            "炼金术",
            "AI科技",
            "AI前线",
            "AI寒武纪",
            "AI大模型",
            "AI工具箱",
            "AI产品",
            "AINLP",
            "PaperAgent",
            "AI异类",
            "硅基观察",
            "AGENT橘",
            "大模型智能",
            "沃垠AI",
            "硅星人",
            "量子位",
            "机器之心",
            "新智元",
            "智东西",
            "脑极体",
            "DeepTech",
            "PaperWeekly",
            "DeeplearningAI",
            "Jina AI",
            "Datawhale",
            "Mimo",
            "Dify",
        ],
    ),
    (
        "ai-edu",
        [
            "教育",
            "学习",
            "课程",
            "教学",
            "学堂",
            "学生",
            "老师",
            "课堂",
            "培训",
            "知识",
            "读书",
            "学校",
            "大学",
            "考研",
            "留学",
            "技能",
            "成长",
            "混沌",
            "得到",
            "樊登",
            "学堂",
            "学院",
        ],
    ),
    (
        "tech-dev",
        [
            "技术",
            "开发",
            "架构",
            "前端",
            "后端",
            "云",
            "开源",
            "GitHub",
            "代码",
            "程序员",
            "工程师",
            "数据库",
            "中间件",
            "掘金",
            "CSDN",
            "InfoQ",
            "51CTO",
            "dbaplus",
            "高可用",
            "运维",
            "SRE",
            "DevOps",
            "Linux",
            "Python",
            "Java",
            "Go",
            "Rust",
            "前端早读课",
            "架构师",
            "技术团队",
            "技术工程",
            "Geek",
        ],
    ),
    (
        "product-design",
        [
            "产品",
            "设计",
            "UX",
            "UI",
            "运营",
            "增长",
            "用户",
            "体验",
            "交互",
            "产品经理",
            "PM",
            "人人都是产品经理",
            "产品犬舍",
            "优设",
            "设计癖",
            "设计夹",
            "Design360",
            "BranD",
            "淘宝设计",
            "PriceTag",
            "APPSO",
            "少数派",
        ],
    ),
    (
        "startup-invest",
        [
            "创业",
            "投资",
            "资本",
            "VC",
            "融资",
            "创投",
            "商业",
            "市场",
            "行业",
            "公司",
            "创始人",
            "36氪",
            "42章经",
            "创业邦",
            "经纬",
            "真格",
            "红杉",
            "高瓴",
            "峰瑞",
            "山行",
            "少数派",
            "投资界",
            "投资实习所",
            "晚点",
            "虎嗅",
            "钛媒体",
            "雷锋网",
        ],
    ),
    (
        "business-finance",
        [
            "财经",
            "金融",
            "经济",
            "股市",
            "基金",
            "证券",
            "银行",
            "货币",
            "宏观",
            "财富",
            "理财",
            "财新",
            "第一财经",
            "央视财经",
            "腾讯财经",
            "网易财经",
            "新浪财经",
            "东方财富",
            "万得",
            "雪球",
            "集思录",
            "ETF",
            "券商",
            "中金",
            "巴伦",
            "华尔街",
            "金融四十人",
        ],
    ),
    (
        "life-culture",
        [
            "生活",
            "文化",
            "读书",
            "心理",
            "情感",
            "成长",
            "人生",
            "社会",
            "人文",
            "艺术",
            "电影",
            "音乐",
            "设计",
            "美食",
            "旅行",
            "豆瓣",
            "三联",
            "新周刊",
            "读者",
            "人物",
            "南方周末",
            "新京报",
            "澎湃",
            "界面",
            "一条",
            "看理想",
            "国家人文",
            "中国国家地理",
            "罗辑思维",
            "樊登",
            "十点读书",
        ],
    ),
    (
        "news-tech-society",
        [
            "新闻",
            "科技",
            "社会",
            "科普",
            "媒体",
            "报道",
            "评论",
            "观察",
            "研究",
            "新华社",
            "人民日报",
            "央视新闻",
            "环球时报",
            "新华社",
            "央视网",
            "中新网",
            "澎湃新闻",
            "界面新闻",
            "新京报",
            "南方周末",
            "财新",
            "科普中国",
            "环球科学",
            "中科院",
            "原理",
            "返朴",
            "知识分子",
        ],
    ),
    (
        "health-science",
        [
            "健康",
            "医疗",
            "医学",
            "医生",
            "养生",
            "科普",
            "科学",
            "生物",
            "心理",
            "丁香医生",
            "生命时报",
            "梅斯医学",
            "中科院",
            "环球科学",
            "知识分子",
            "神经现实",
        ],
    ),
    (
        "sports-entertainment",
        [
            "体育",
            "运动",
            "足球",
            "篮球",
            "NBA",
            "电影",
            "娱乐",
            "明星",
            "游戏",
            "电竞",
            "腾讯NBA",
            "体坛周报",
            "足球报",
            "篮球",
            "懂球",
            "五星体育",
            "独立鱼",
            "游戏葡萄",
            "游戏研究社",
        ],
    ),
]


def classify_sources() -> dict[str, list[str]]:
    sources = rss_service.load_sources()
    mapping: dict[str, list[str]] = {}

    for source in sources:
        name = source.name
        categories: list[str] = []
        for topic_id, keywords in TOPIC_RULES:
            if any(kw.lower() in name.lower() for kw in keywords):
                if topic_id not in categories:
                    categories.append(topic_id)
        if not categories:
            categories.append("news-tech-society")
        mapping[source.id] = categories

    return mapping


def main() -> None:
    mapping = classify_sources()
    output_path = Path(__file__).resolve().parents[1] / "resources" / "source_categories.json"
    output_path.write_text(
        json.dumps(mapping, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"已生成分类文件：{output_path}")

    # 统计
    topic_counts: dict[str, int] = {}
    for categories in mapping.values():
        for c in categories:
            topic_counts[c] = topic_counts.get(c, 0) + 1
    print("\n话题分布：")
    for topic_id, count in sorted(topic_counts.items(), key=lambda x: -x[1]):
        print(f"  {topic_id}: {count}")


if __name__ == "__main__":
    main()
