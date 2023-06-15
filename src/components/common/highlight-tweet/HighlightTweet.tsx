import { Button } from "../button";
import { Twitter } from "@/components/icons";

const HighlightTweet = ({ id }: { id: string | undefined }) => {
  if (!id) return null;

  return (
    <div className="flex flex-row flex-wrap gap-4 justify-center items-center h-fit w-fit rounded-xl shadow-card-rest-dark p-4 mx-auto bg-base-dark">
      <h4 className="text-headers-h4">Like this demo?</h4>
      <p className="text-subtle-dark text-center">
        Help us spread the word by liking our Recap announcement Tweet:
      </p>

      <a
        href={`https://twitter.com/intent/like?tweet_id=${id}`}
        target="_blank"
      >
        <Button>
          <Twitter />
          Like Tweet
        </Button>
      </a>
    </div>
  );
};

export default HighlightTweet;
