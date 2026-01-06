import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Film, DollarSign, Star, Award, BarChart3 } from 'lucide-react';

const TMDB_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MTRmNzY0NzljNTlmY2JlMTg2N2RlMTk5OTUwYTRhNiIsInN1YiI6IjY2Njc2N2UyZWVhZGEwYTlkNWJlNzg5OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.dyNQdzF9SUmFT_U_HKgl6sutF1w3pyvadufBW1rovBE'
  }
};

const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

const COLORS = ['#E50914', '#F5F5F1', '#564D4D', '#831010', '#DB202C', '#FF0000', '#8B0000'];

export default function FlixStats() {
  const [loading, setLoading] = useState(true);
  const [movies, setMovies] = useState([]);
  const [genreData, setGenreData] = useState([]);
  const [ratingData, setRatingData] = useState([]);
  const [topMovies, setTopMovies] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [budgetRevenueData, setBudgetRevenueData] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    avgRating: 0,
    totalMovies: 0,
    topGenre: ''
  });

  useEffect(() => {
    fetchAllMovies();
  }, []);

  const fetchAllMovies = async () => {
    try {
      console.log('Starting to fetch movies...');
      let allMovies = [];
      
      // Fetch multiple pages of popular movies for better data
      for (let page = 1; page <= 3; page++) {
        console.log(`Fetching page ${page}...`);
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/popular?language=en-US&page=${page}`,
          TMDB_OPTIONS
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Got ${data.results.length} movies from page ${page}`);
        allMovies = [...allMovies, ...data.results];
      }

      console.log(`Total movies fetched: ${allMovies.length}`);

      // Fetch detailed info for top movies (needed for budget/revenue)
      console.log('Fetching detailed info for top 30 movies...');
      const detailedMovies = await Promise.all(
        allMovies.slice(0, 30).map(async (movie) => {
          try {
            const detailResponse = await fetch(
              `https://api.themoviedb.org/3/movie/${movie.id}?language=en-US`,
              TMDB_OPTIONS
            );
            const details = await detailResponse.json();
            return { ...movie, ...details };
          } catch (err) {
            console.error(`Error fetching details for ${movie.title}:`, err);
            return movie;
          }
        })
      );

      console.log('Processing data...');
      setMovies(detailedMovies);
      processAllData(detailedMovies);
      setLoading(false);
      console.log('Dashboard ready!');
    } catch (error) {
      console.error('Error fetching movies:', error);
      alert(`Error loading data: ${error.message}`);
      setLoading(false);
    }
  };

  const processAllData = (movieData) => {
    // 1. Process Genre Distribution
    const genreCount = {};
    movieData.forEach(movie => {
      movie.genre_ids?.forEach(genreId => {
        const genreName = GENRE_MAP[genreId] || 'Other';
        genreCount[genreName] = (genreCount[genreName] || 0) + 1;
      });
    });
    const genreArray = Object.entries(genreCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    setGenreData(genreArray);

    // 2. Process Rating Distribution
    const ratingRanges = [
      { range: '0-2', count: 0 },
      { range: '2-4', count: 0 },
      { range: '4-6', count: 0 },
      { range: '6-8', count: 0 },
      { range: '8-10', count: 0 }
    ];
    movieData.forEach(movie => {
      const rating = movie.vote_average || 0;
      if (rating < 2) ratingRanges[0].count++;
      else if (rating < 4) ratingRanges[1].count++;
      else if (rating < 6) ratingRanges[2].count++;
      else if (rating < 8) ratingRanges[3].count++;
      else ratingRanges[4].count++;
    });
    setRatingData(ratingRanges);

    // 3. Process Top 10 Movies by Popularity
    const top10 = movieData
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10)
      .map(m => ({
        title: m.title.length > 20 ? m.title.substring(0, 20) + '...' : m.title,
        popularity: Math.round(m.popularity),
        rating: m.vote_average
      }));
    setTopMovies(top10);

    // 4. Process Timeline Data (by release year)
    const yearData = {};
    movieData.forEach(movie => {
      if (movie.release_date) {
        const year = movie.release_date.split('-')[0];
        if (year >= '2020') {
          yearData[year] = (yearData[year] || 0) + 1;
        }
      }
    });
    const timeline = Object.entries(yearData)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));
    setTimelineData(timeline);

    // 5. Process Budget vs Revenue Data
    const budgetRevenue = movieData
      .filter(m => m.budget > 0 && m.revenue > 0)
      .map(m => ({
        title: m.title,
        budget: m.budget / 1000000,
        revenue: m.revenue / 1000000,
        rating: m.vote_average
      }))
      .slice(0, 30);
    setBudgetRevenueData(budgetRevenue);

    // 6. Calculate Stats
    const totalRevenue = movieData.reduce((sum, m) => sum + (m.revenue || 0), 0);
    const avgRating = movieData.reduce((sum, m) => sum + (m.vote_average || 0), 0) / movieData.length;
    
    setStats({
      totalRevenue: (totalRevenue / 1000000000).toFixed(2),
      avgRating: avgRating.toFixed(1),
      totalMovies: movieData.length,
      topGenre: genreArray[0]?.name || 'N/A'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Film className="w-16 h-16 text-red-600 animate-pulse mx-auto mb-4" />
          <div className="text-white text-2xl font-bold">Loading FlixStats...</div>
          <div className="text-gray-400 mt-2">Analyzing movie data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Film className="w-10 h-10 text-red-600" />
            <h1 className="text-5xl font-bold text-white">FlixStats</h1>
          </div>
          <p className="text-gray-400 text-lg">Comprehensive Movie Industry Analytics Dashboard</p>
        </div>

        {/* Key Insight Banner */}
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Key Insight</h3>
              <p className="text-gray-300">
                {stats.topGenre} dominates with the highest volume. Average rating across {stats.totalMovies} movies is {stats.avgRating}/10. 
                {budgetRevenueData.length > 0 && ` ${budgetRevenueData.filter(m => m.revenue > m.budget * 2).length} films achieved 2x+ ROI.`}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={<DollarSign />} 
            label="Total Box Office" 
            value={`$${stats.totalRevenue}B`} 
            color="bg-green-600" 
          />
          <StatCard 
            icon={<Star />} 
            label="Average Rating" 
            value={stats.avgRating} 
            color="bg-yellow-500" 
          />
          <StatCard 
            icon={<Film />} 
            label="Movies Analyzed" 
            value={stats.totalMovies} 
            color="bg-red-600" 
          />
          <StatCard 
            icon={<Award />} 
            label="Top Genre" 
            value={stats.topGenre} 
            color="bg-blue-600" 
          />
        </div>

        {/* Charts Row 1: Genre & Rating */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Genre Distribution */}
          <ChartCard title="Genre Distribution" icon={<BarChart3 />}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genreData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Rating Distribution */}
          <ChartCard title="Rating Distribution" icon={<Star />}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="range" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#E50914" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Charts Row 2: Timeline & Top Movies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Release Timeline */}
          <ChartCard title="Movies Released (2020-2025)" icon={<TrendingUp />}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="year" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#E50914" 
                  strokeWidth={3}
                  dot={{ fill: '#E50914', r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top 10 Movies by Popularity */}
          <ChartCard title="Top 10 Most Popular Movies" icon={<Award />}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topMovies} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#999" />
                <YAxis 
                  dataKey="title" 
                  type="category" 
                  width={120}
                  stroke="#999"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="popularity" fill="#E50914" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Budget vs Revenue Scatter Plot */}
        {budgetRevenueData.length > 0 && (
          <ChartCard title="Budget vs Revenue Analysis (ROI)" icon={<DollarSign />}>
            <div className="text-gray-400 text-sm mb-4">
              Each dot represents a movie. Position above the diagonal line indicates profitability. Size represents rating.
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  type="number" 
                  dataKey="budget" 
                  name="Budget" 
                  unit="M"
                  stroke="#999"
                  label={{ value: 'Budget (Millions $)', position: 'insideBottom', offset: -5, fill: '#999' }}
                />
                <YAxis 
                  type="number" 
                  dataKey="revenue" 
                  name="Revenue" 
                  unit="M"
                  stroke="#999"
                  label={{ value: 'Revenue (Millions $)', angle: -90, position: 'insideLeft', fill: '#999' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value, name) => [`$${value.toFixed(1)}M`, name]}
                />
                <Scatter 
                  name="Movies" 
                  data={budgetRevenueData} 
                  fill="#E50914"
                >
                  {budgetRevenueData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.revenue > entry.budget ? '#00C49F' : '#FF8042'}
                    />
                  ))}
                </Scatter>
                <Line 
                  type="linear" 
                  dataKey="budget" 
                  stroke="#666" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Data Table */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800 p-6 mt-6">
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Film className="w-6 h-6 text-red-600" />
            Movie Data Table
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-3 text-gray-400 font-semibold">Title</th>
                  <th className="pb-3 text-gray-400 font-semibold">Rating</th>
                  <th className="pb-3 text-gray-400 font-semibold">Popularity</th>
                  <th className="pb-3 text-gray-400 font-semibold">Release</th>
                  <th className="pb-3 text-gray-400 font-semibold">Genre</th>
                </tr>
              </thead>
              <tbody>
                {movies.slice(0, 15).map((movie, index) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 text-white font-medium">{movie.title}</td>
                    <td className="py-3 text-yellow-400 font-semibold">
                      ⭐ {movie.vote_average?.toFixed(1)}
                    </td>
                    <td className="py-3 text-red-400 font-semibold">
                      {Math.round(movie.popularity)}
                    </td>
                    <td className="py-3 text-gray-400">
                      {movie.release_date}
                    </td>
                    <td className="py-3 text-gray-300">
                      {movie.genre_ids?.map(id => GENRE_MAP[id]).slice(0, 2).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800 p-6 hover:border-red-600 transition-all">
      <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
        {React.cloneElement(icon, { className: "text-white", size: 24 })}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        {React.cloneElement(icon, { className: "text-red-600", size: 24 })}
        {title}
      </h3>
      {children}
    </div>
  );
}