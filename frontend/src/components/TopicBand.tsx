import type { TopicConfig } from "../types";

interface TopicBandProps {
  topics: TopicConfig[];
  activeTopicId: string;
  onTopicChange: (topicId: string) => void;
}

export function TopicBand({ topics, activeTopicId, onTopicChange }: TopicBandProps) {
  return (
    <section className="topicBand" id="topics">
      <div className="sectionTitle">
        <span className="font-bungee">选择话题</span>
        <small>{topics.length} 个话题</small>
      </div>
      <div className="topicRiver">
        {topics.map((topic) => (
          <button
            key={topic.id}
            className={topic.id === activeTopicId ? "topicSlip active" : "topicSlip"}
            onClick={() => onTopicChange(topic.id)}
          >
            <span className="topicMark">{topic.name.slice(0, 1)}</span>
            <strong>{topic.name}</strong>
            <small>{topic.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
