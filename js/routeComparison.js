/**
 * Route Comparison Module
 * Handles route filtering and sorting logic for enhanced route finding
 * Works with enhancedRouteFinder.js to provide comparison functionality
 */
class RouteComparison {
  constructor() {
    this.routes = null;
    this.currentSort = 'time';
    this.filters = {
      types: ['stand_route', 'hybrid_route', 'direct_auto', 'train_route'],
      maxTime: null,
      maxFare: null,
      maxDistance: null
    };

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Listen for route updates from enhancedRouteFinder
    document.addEventListener('routesUpdated', (e) => {
      this.routes = e.detail.routes;
      this.updateComparisonUI();
    });

    // Listen for tab changes
    document.addEventListener('tabChanged', (e) => {
      this.handleTabChange(e.detail.tab);
    });
  }

  setRoutes(routes) {
    this.routes = routes;
    this.updateComparisonUI();
  }

  handleTabChange(tabName) {
    switch (tabName) {
      case 'fastest':
        this.sortBy('time');
        break;
      case 'cheapest':
        this.sortBy('fare');
        break;
      case 'shortest':
        this.sortBy('distance');
        break;
      default:
        this.sortBy('time');
    }
  }

  sortBy(criteria) {
    this.currentSort = criteria;

    if (!this.routes) return [];

    const allRoutes = this.flattenRoutes(this.routes);

    let sortedRoutes;

    switch (criteria) {
      case 'time':
        sortedRoutes = this.sortByTime(allRoutes);
        break;
      case 'fare':
        sortedRoutes = this.sortByFare(allRoutes);
        break;
      case 'distance':
        sortedRoutes = this.sortByDistance(allRoutes);
        break;
      case 'confidence':
        sortedRoutes = this.sortByConfidence(allRoutes);
        break;
      default:
        sortedRoutes = allRoutes;
    }

    return this.applyFilters(sortedRoutes);
  }

  flattenRoutes(routesData) {
    const allRoutes = [];

    // Add stand routes
    if (routesData.stand_routes) {
      routesData.stand_routes.forEach(route => {
        allRoutes.push({
          ...route,
          category: 'stand_routes'
        });
      });
    }

    // Add hybrid routes
    if (routesData.hybrid_routes) {
      routesData.hybrid_routes.forEach(route => {
        allRoutes.push({
          ...route,
          category: 'hybrid_routes'
        });
      });
    }

    // Add direct auto route
    if (routesData.direct_auto) {
      allRoutes.push({
        ...routesData.direct_auto,
        category: 'direct_auto'
      });
    }

    // Add train route
    if (routesData.train_route) {
      allRoutes.push({
        ...routesData.train_route,
        category: 'train_route'
      });
    }

    return allRoutes;
  }

  sortByTime(routes) {
    return routes.sort((a, b) => {
      const timeA = a.total_time || Infinity;
      const timeB = b.total_time || Infinity;
      return timeA - timeB;
    });
  }

  sortByFare(routes) {
    return routes.sort((a, b) => {
      const fareA = a.total_fare !== undefined ? a.total_fare : Infinity;
      const fareB = b.total_fare !== undefined ? b.total_fare : Infinity;
      return fareA - fareB;
    });
  }

  sortByDistance(routes) {
    return routes.sort((a, b) => {
      const distA = a.total_distance || Infinity;
      const distB = b.total_distance || Infinity;
      return distA - distB;
    });
  }

  sortByConfidence(routes) {
    return routes.sort((a, b) => {
      const confA = a.confidence || 0;
      const confB = b.confidence || 0;
      return confB - confA; // Higher confidence first
    });
  }

  applyFilters(routes) {
    return routes.filter(route => {
      // Filter by route type
      if (!this.filters.types.includes(route.type)) {
        return false;
      }

      // Filter by max time
      if (this.filters.maxTime && route.total_time > this.filters.maxTime) {
        return false;
      }

      // Filter by max fare
      if (this.filters.maxFare !== null && route.total_fare !== undefined && route.total_fare > this.filters.maxFare) {
        return false;
      }

      // Filter by max distance
      if (this.filters.maxDistance && route.total_distance > this.filters.maxDistance) {
        return false;
      }

      return true;
    });
  }

  updateComparisonUI() {
    if (!this.routes) return;

    // Update comparison statistics
    this.updateStatistics();

    // Update route rankings
    this.updateRankings();

    // Update recommendations
    this.updateRecommendations();
  }

  updateStatistics() {
    const allRoutes = this.flattenRoutes(this.routes);

    const stats = {
      total: allRoutes.length,
      stand_routes: allRoutes.filter(r => r.type === 'stand_route').length,
      hybrid_routes: allRoutes.filter(r => r.type === 'hybrid_route').length,
      direct_auto: allRoutes.filter(r => r.type === 'direct_auto').length,
      train_routes: allRoutes.filter(r => r.type === 'train_route').length,
      fastest: this.getFastestRoute(allRoutes),
      cheapest: this.getCheapestRoute(allRoutes),
      shortest: this.getShortestRoute(allRoutes)
    };

    this.displayStatistics(stats);
  }

  getFastestRoute(routes) {
    return routes.reduce((fastest, route) => {
      if (!fastest || (route.total_time && route.total_time < fastest.total_time)) {
        return route;
      }
      return fastest;
    }, null);
  }

  getCheapestRoute(routes) {
    return routes.reduce((cheapest, route) => {
      if (route.total_fare === undefined) return cheapest;
      if (!cheapest || (route.total_fare < cheapest.total_fare)) {
        return route;
      }
      return cheapest;
    }, null);
  }

  getShortestRoute(routes) {
    return routes.reduce((shortest, route) => {
      if (!shortest || (route.total_distance && route.total_distance < shortest.total_distance)) {
        return route;
      }
      return shortest;
    }, null);
  }

  displayStatistics(stats) {
    // Update statistics display if element exists
    const statsContainer = document.getElementById('routeStatistics');
    if (!statsContainer) return;

    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">${stats.total}</span>
          <span class="stat-label">Total Routes</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.stand_routes}</span>
          <span class="stat-label">Share Auto</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.hybrid_routes}</span>
          <span class="stat-label">Hybrid</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.direct_auto}</span>
          <span class="stat-label">Direct Auto</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.train_routes}</span>
          <span class="stat-label">Train</span>
        </div>
      </div>

      ${stats.fastest ? `
        <div class="best-route">
          <strong>⚡ Fastest:</strong> ${stats.fastest.title} (${stats.fastest.total_time} min)
        </div>
      ` : ''}
      ${stats.cheapest ? `
        <div class="best-route">
          <strong>💰 Cheapest:</strong> ${stats.cheapest.title} (₹${stats.cheapest.total_fare.toFixed(2)})
        </div>
      ` : ''}
      ${stats.shortest ? `
        <div class="best-route">
          <strong>📏 Shortest:</strong> ${stats.shortest.title} (${stats.shortest.total_distance.toFixed(1)} km)
        </div>
      ` : ''}
    `;
  }

  updateRankings() {
    const rankings = this.calculateRankings();
    this.displayRankings(rankings);
  }

  calculateRankings() {
    const allRoutes = this.flattenRoutes(this.routes);

    return allRoutes.map((route, index) => {
      const ranking = {
        route: route,
        overallRank: index + 1,
        timeRank: this.getTimeRank(route, allRoutes),
        fareRank: this.getFareRank(route, allRoutes),
        distanceRank: this.getDistanceRank(route, allRoutes)
      };

      ranking.averageRank = (ranking.timeRank + ranking.fareRank + ranking.distanceRank) / 3;
      return ranking;
    }).sort((a, b) => a.averageRank - b.averageRank);
  }

  getTimeRank(route, allRoutes) {
    const sorted = this.sortByTime([...allRoutes]);
    return sorted.findIndex(r => r.id === route.id) + 1;
  }

  getFareRank(route, allRoutes) {
    if (route.total_fare === undefined) return allRoutes.length + 1;
    const sorted = this.sortByFare([...allRoutes]);
    return sorted.findIndex(r => r.id === route.id) + 1;
  }

  getDistanceRank(route, allRoutes) {
    const sorted = this.sortByDistance([...allRoutes]);
    return sorted.findIndex(r => r.id === route.id) + 1;
  }

  displayRankings(rankings) {
    // Update rankings display if element exists
    const rankingsContainer = document.getElementById('routeRankings');
    if (!rankingsContainer) return;

    rankingsContainer.innerHTML = rankings.slice(0, 3).map(ranking => `
      <div class="ranking-item">
        <span class="rank">#${ranking.overallRank}</span>
        <span class="route-name">${ranking.route.title}</span>
        <span class="rank-details">
          ⏱️ #${ranking.timeRank}
          💰 #${ranking.fareRank}
          📏 #${ranking.distanceRank}
        </span>
      </div>
    `).join('');
  }

  updateRecommendations() {
    const recommendations = this.generateRecommendations();
    this.displayRecommendations(recommendations);
  }

  generateRecommendations() {
    const allRoutes = this.flattenRoutes(this.routes);
    const recommendations = [];

    // Best overall route
    const bestOverall = this.getBestOverallRoute(allRoutes);
    if (bestOverall) {
      recommendations.push({
        type: 'best_overall',
        title: 'Best Overall Choice',
        route: bestOverall,
        reason: this.getRecommendationReason(bestOverall, 'overall')
      });
    }

    // Most economical
    const mostEconomical = this.getMostEconomicalRoute(allRoutes);
    if (mostEconomical && mostEconomical !== bestOverall) {
      recommendations.push({
        type: 'most_economical',
        title: 'Most Economical',
        route: mostEconomical,
        reason: this.getRecommendationReason(mostEconomical, 'economy')
      });
    }

    // Most reliable (highest confidence)
    const mostReliable = this.getMostReliableRoute(allRoutes);
    if (mostReliable && mostReliable !== bestOverall) {
      recommendations.push({
        type: 'most_reliable',
        title: 'Most Reliable',
        route: mostReliable,
        reason: this.getRecommendationReason(mostReliable, 'reliability')
      });
    }

    return recommendations;
  }

  getBestOverallRoute(routes) {
    // Calculate a weighted score for each route
    return routes.reduce((best, route) => {
      const score = this.calculateOverallScore(route);
      const bestScore = best ? this.calculateOverallScore(best) : 0;
      return score > bestScore ? route : best;
    }, null);
  }

  calculateOverallScore(route) {
    // Normalize metrics and apply weights
    const timeScore = Math.max(0, 100 - (route.total_time || 120)); // Lower time is better
    const fareScore = route.total_fare !== undefined ? Math.max(0, 100 - route.total_fare) : 50;
    const confidenceScore = (route.confidence || 0.8) * 100;

    // Weights: Time (40%), Fare (35%), Confidence (25%)
    return (timeScore * 0.4) + (fareScore * 0.35) + (confidenceScore * 0.25);
  }

  getMostEconomicalRoute(routes) {
    return this.getCheapestRoute(routes);
  }

  getMostReliableRoute(routes) {
    return routes.reduce((mostReliable, route) => {
      const reliability = route.confidence || 0.5;
      const mostReliability = mostReliable ? (mostReliable.confidence || 0.5) : 0;
      return reliability > mostReliability ? route : mostReliable;
    }, null);
  }

  getRecommendationReason(route, type) {
    switch (type) {
      case 'overall':
        return `Good balance of time (${route.total_time} min), cost (₹${route.total_fare?.toFixed(2)}), and reliability`;
      case 'economy':
        return `Lowest cost at ₹${route.total_fare?.toFixed(2)} while taking ${route.total_time} minutes`;
      case 'reliability':
        return `Highest confidence rating (${Math.round((route.confidence || 0.8) * 100)}%) for successful completion`;
      default:
        return `Recommended route option`;
    }
  }

  displayRecommendations(recommendations) {
    // Update recommendations display if element exists
    const recommendationsContainer = document.getElementById('routeRecommendations');
    if (!recommendationsContainer) return;

    recommendationsContainer.innerHTML = `
      <h3>Recommended Routes</h3>
      <div class="recommendations-list">
        ${recommendations.map(rec => `
          <div class="recommendation-item recommendation-${rec.type}">
            <div class="recommendation-header">
              <span class="recommendation-title">${rec.title}</span>
              <span class="recommendation-badge">${this.getRecommendationBadge(rec.type)}</span>
            </div>
            <div class="recommendation-route">
              <strong>${rec.route.title}</strong>
              <span class="recommendation-stats">
                ⏱️ ${rec.route.total_time} min •
                📏 ${rec.route.total_distance?.toFixed(1)} km •
                💰 ₹${rec.route.total_fare?.toFixed(2)}
              </span>
            </div>
            <div class="recommendation-reason">
              ${rec.reason}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  getRecommendationBadge(type) {
    const badges = {
      'best_overall': '🏆 Best',
      'most_economical': '💰 Budget',
      'most_reliable': '✅ Reliable'
    };
    return badges[type] || '⭐ Recommended';
  }

  // Filter controls
  setFilter(filterType, value) {
    switch (filterType) {
      case 'types':
        this.filters.types = value;
        break;
      case 'maxTime':
        this.filters.maxTime = value;
        break;
      case 'maxFare':
        this.filters.maxFare = value;
        break;
      case 'maxDistance':
        this.filters.maxDistance = value;
        break;
    }

    // Trigger re-filtering
    if (window.enhancedRouteFinder) {
      window.enhancedRouteFinder.displayRoutes();
    }
  }

  getFilterControls() {
    return `
      <div class="filter-controls">
        <div class="filter-group">
          <label>Route Types:</label>
          <div class="checkbox-group">
            <label><input type="checkbox" value="stand_route" checked> Share Auto</label>
            <label><input type="checkbox" value="hybrid_route" checked> Hybrid</label>
            <label><input type="checkbox" value="direct_auto" checked> Direct Auto</label>
            <label><input type="checkbox" value="train_route" checked> Train</label>
          </div>
        </div>

        <div class="filter-group">
          <label>Max Time (minutes):</label>
          <input type="number" id="maxTimeFilter" placeholder="No limit" min="1">
        </div>

        <div class="filter-group">
          <label>Max Fare (₹):</label>
          <input type="number" id="maxFareFilter" placeholder="No limit" min="1">
        </div>

        <div class="filter-group">
          <label>Max Distance (km):</label>
          <input type="number" id="maxDistanceFilter" placeholder="No limit" min="1" step="0.1">
        </div>
      </div>
    `;
  }

  initializeFilterControls() {
    // Setup filter control event listeners
    document.querySelectorAll('input[type="checkbox"][value]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const checkedTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
          .map(cb => cb.value);
        this.setFilter('types', checkedTypes);
      });
    });

    document.getElementById('maxTimeFilter')?.addEventListener('input', (e) => {
      const value = e.target.value ? parseInt(e.target.value) : null;
      this.setFilter('maxTime', value);
    });

    document.getElementById('maxFareFilter')?.addEventListener('input', (e) => {
      const value = e.target.value ? parseFloat(e.target.value) : null;
      this.setFilter('maxFare', value);
    });

    document.getElementById('maxDistanceFilter')?.addEventListener('input', (e) => {
      const value = e.target.value ? parseFloat(e.target.value) : null;
      this.setFilter('maxDistance', value);
    });
  }
}

// Initialize route comparison when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.routeComparison = new RouteComparison();

  // Initialize filter controls if they exist
  setTimeout(() => {
    window.routeComparison.initializeFilterControls();
  }, 100);
});