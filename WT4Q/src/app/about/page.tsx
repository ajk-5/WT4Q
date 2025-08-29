import styles from './page.module.css';

export const metadata = {
  title: 'About The Nineties Times',
};

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>About The Nineties Times</h1>
      <p>
The Nineties Times is an interactive website created to keep you informed, entertained, and engaged all in one place. It provides the latest news, articles, and information on a wide variety of topics including politics, crime, entertainment, business, health, lifestyle, sports, and weather. But The Nineties Times is more than just a news site—it also offers fun games, useful tools, and interactive features to make the experience enjoyable for every type of user.
</p>

<p>
At the heart of The Nineties Times lies the power of Google’s Gemini AI, which helps automate the platform and ensure that the content you see is personalized and relevant. The website is managed by a team of administrators and super administrators who act as authors, publishing and curating articles. Meanwhile, users are encouraged to engage with content by commenting, liking, and sharing their thoughts, creating a lively and connected community.
</p>

<p>
The Nineties Times also integrates smart external services to make your experience richer. The weather section, powered by the reliable MET.no API, gives you real-time and accurate weather updates. There’s also a world clock that not only shows the current time in major cities around the globe but also provides live weather information for those locations. On top of this, news and articles are personalized to match your location, so you always stay updated with what matters most to you.
</p>

<p>
Security is a top priority for The Nineties Times. The platform uses Bcrypt encryption to protect user data and integrates Google OAuth for secure authentication. This ensures that every user can browse, interact, and participate with complete peace of mind. By combining the intelligence of AI with trusted external APIs, The Nineties Times delivers a comprehensive digital hub where staying informed is effortless, engaging, and secure.
</p>
<p>Our next top priority is  Newsletter functionality. We are working on it and will be published after some week.</p>
<p></p>
    </div>
  );
}
