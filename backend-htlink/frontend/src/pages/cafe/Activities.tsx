import React, { useEffect, useState } from "react";
import { restaurantActivityLogsApi, type RestaurantActivityItem } from "../../services/restaurantApi";

const RestaurantActivities: React.FC = () => {
  const [activities, setActivities] = useState<RestaurantActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");
  const [days, setDays] = useState<number>(7);

  useEffect(() => {
    loadActivities();
  }, [filter, days]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await restaurantActivityLogsApi.getAllActivities(100, days);

      let filteredData = data;
      if (filter !== "all") {
        filteredData = data.filter((activity) => activity.type === filter);
      }

      setActivities(filteredData);
      setError("");
    } catch (loadError) {
      console.error("Failed to load activities:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="px-6 pb-6 pt-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
            <p className="mt-4 text-lg font-semibold text-slate-700">Loading activities...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="px-6 pb-6 pt-6">
        <div className="rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <strong>Error loading activities:</strong> {error}
          <button
            onClick={loadActivities}
            className="ml-4 rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 pb-6 pt-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Restaurant Activity Log</h1>
        <p className="mt-2 text-slate-600">
          Track logins and content management activity across the amusement park dashboard
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Activity Type
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Activities</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="upload_media">Upload Media</option>
              <option value="delete_media">Delete Media</option>
              <option value="create_category">Create Category</option>
              <option value="update_category">Update Category</option>
              <option value="delete_category">Delete Category</option>
              <option value="create_post">Create Post</option>
              <option value="update_post">Update Post</option>
              <option value="delete_post">Delete Post</option>
              <option value="create_property">Create Property</option>
              <option value="update_property">Update Property</option>
              <option value="delete_property">Delete Property</option>
              <option value="create_feature">Create Feature</option>
              <option value="update_feature">Update Feature</option>
              <option value="delete_feature">Delete Feature</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Time Period
            </label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <button
            onClick={loadActivities}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <div className="mb-2 text-slate-400">
              <i className="fas fa-inbox text-4xl"></i>
            </div>
            <p className="font-medium text-slate-600">No activities found</p>
            <p className="mt-1 text-sm text-slate-500">
              Try adjusting your filters to see more activities
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="rounded-lg border border-slate-200 border-l-4 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md"
              style={{ borderLeftColor: activity.iconBg }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: activity.iconBg,
                    color: activity.iconColor,
                  }}
                >
                  <i className={activity.icon}></i>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span>User</span>
                          <span>{activity.user_name}</span>
                        </span>
                        <span>&bull;</span>
                        <span>{activity.time}</span>
                        {activity.ip_address && (
                          <>
                            <span>&bull;</span>
                            <span>IP {activity.ip_address}</span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                          {activity.type
                            .replace(/_/g, " ")
                            .split(" ")
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {activities.length > 0 && (
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>Showing {activities.length} activities from the last {days} days</p>
        </div>
      )}
    </main>
  );
};

export default RestaurantActivities;



