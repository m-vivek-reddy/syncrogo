import RideMap from '../RideMap';
import HomeHeader from '../Home/Header';

export default function HomeMap() {
  return (
    <div className="relative h-[40vh] min-h-[320px] sm:h-[44vh]">
      <HomeHeader />
      <div className="h-full [&>div]:h-full [&>div]:rounded-none [&>div]:border-0">
        <RideMap />
      </div>
    </div>
  );
}
